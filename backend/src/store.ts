import { Client as DbClient } from '@votingworks/db';
// import { Iso8601Timestamp } from '@votingworks/types';
import { join } from 'node:path';
// import { v4 as uuid } from 'uuid';
import { BaseLogger } from '@votingworks/logging';
import {
  assert,
  find,
  groupBy,
  throwIllegalValue,
  typedAs,
} from '@votingworks/basics';
import { safeParseJson } from '@votingworks/types';
import { rootDebug } from './debug';
import {
  ConnectedPollbookService,
  Election,
  ElectionSchema,
  EventDbRow,
  EventType,
  PollbookConnectionStatus,
  PollbookEvent,
  PollBookService,
  UndoVoterCheckInEvent,
  Voter,
  VoterCheckInEvent,
  VoterCheckInSchema,
  VoterIdentificationMethod,
  VoterSchema,
  VoterSearchParams,
} from './types';
import { MACHINE_DISCONNECTED_TIMEOUT } from './globals';
import { HlcTimestamp, HybridLogicalClock } from './hybrid_logical_clock';

const debug = rootDebug;

const data: {
  voters?: Voter[];
  election?: Election;
  connectedPollbooks: Record<string, PollBookService>;
  currentClock?: HybridLogicalClock;
  isOnline: boolean;
} = {
  connectedPollbooks: {},
  isOnline: false,
};

const SchemaPath = join(__dirname, '../schema.sql');

export class Store {
  private constructor(
    private readonly client: DbClient,
    private readonly machineId: string
  ) {}

  // Increments the vector clock for the current machine and returns the new value.
  // This function MUST be called before saving an event for the current machine.
  private incrementClock(): HlcTimestamp {
    if (!data.currentClock) {
      data.currentClock = new HybridLogicalClock(this.machineId);
    }
    return data.currentClock.tick();
  }

  private updateLocalVectorClock(remoteClock: HlcTimestamp): HlcTimestamp {
    if (!data.currentClock) {
      data.currentClock = new HybridLogicalClock(this.machineId);
    }
    return data.currentClock.update(remoteClock);
  }

  private applyEventsToVoterCheckInTable(): void {
    this.client.transaction(() => {
      // Apply all events in order to build initial state
      const rows = this.client.all(
        `
        SELECT * FROM event_log 
        ORDER BY physical_time, logical_counter, machine_id
      `
      ) as EventDbRow[];

      const orderedEvents = this.convertRowsToPollbookEvents(rows);

      for (const event of orderedEvents) {
        switch (event.type) {
          case EventType.VoterCheckIn: {
            this.client.run(
              `
            UPDATE voter_check_in_status 
            SET is_checked_in = 1,
                machine_id = ?,
                check_in_data = ?
            WHERE voter_id = ?
          `,
              event.machineId,
              JSON.stringify((event as VoterCheckInEvent).checkInData),
              (event as VoterCheckInEvent).voterId
            );
            break;
          }
          case EventType.UndoVoterCheckIn: {
            this.client.run(
              `
            UPDATE voter_check_in_status 
            SET is_checked_in = 0,
                machine_id = NULL
            WHERE voter_id = ?
          `,
              (event as UndoVoterCheckInEvent).voterId
            );
            break;
          }
          default: {
            throwIllegalValue(event.type);
          }
        }
      }
    });
  }

  getMachineId(): string {
    return this.machineId;
  }

  setOnlineStatus(isOnline: boolean): void {
    data.isOnline = isOnline;
    if (!isOnline) {
      // If we go offline, we should clear the list of connected pollbooks.
      for (const [avahiServiceName, pollbookService] of Object.entries(
        data.connectedPollbooks
      )) {
        this.setPollbookServiceForName(avahiServiceName, {
          ...pollbookService,
          status: PollbookConnectionStatus.LostConnection,
          apiClient: undefined,
        });
      }
    }
  }

  isOnline(): boolean {
    return data.isOnline;
  }

  getDbPath(): string {
    return this.client.getDatabasePath();
  }

  /**
   * Builds and returns a new store at `dbPath`.
   */
  static fileStore(
    dbPath: string,
    logger: BaseLogger,
    machineId: string
  ): Store {
    return new Store(
      DbClient.fileClient(dbPath, logger, SchemaPath),
      machineId
    );
  }

  /**
   * Builds and returns a new store whose data is kept in memory.
   */
  static memoryStore(machineId: string): Store {
    return new Store(DbClient.memoryClient(SchemaPath), machineId);
  }

  private getVoters(): Voter[] | undefined {
    // Load the voters from the database if they are not in memory.
    const rows = this.client.all(
      `
        SELECT v.voter_data, vc.check_in_data
        FROM voters v
        LEFT JOIN voter_check_in_status vc ON v.voter_id = vc.voter_id
      `
    ) as Array<{ voter_data: string; check_in_data: string | null }>;
    if (!rows) {
      return undefined;
    }
    return rows.map((row) => {
      const voter = safeParseJson(row.voter_data, VoterSchema).unsafeUnwrap();
      if (row.check_in_data) {
        voter.checkIn = safeParseJson(
          row.check_in_data,
          VoterCheckInSchema
        ).unsafeUnwrap();
      }
      return voter;
    });
  }

  // Saves all events received from a remote machine. Returning the last event's timestamp.
  saveRemoteEvents(
    pollbookEvents: PollbookEvent[],
    lastSyncTime: HlcTimestamp
  ): HlcTimestamp {
    let isSuccess = true;
    let lastSyncedTimestamp = lastSyncTime;
    this.client.transaction(() => {
      for (const pollbookEvent of pollbookEvents) {
        isSuccess = isSuccess && this.saveEvent(pollbookEvent);
        if (!lastSyncedTimestamp) {
          lastSyncedTimestamp = pollbookEvent.timestamp;
        }
        if (
          HybridLogicalClock.compareHlcTimestamps(
            lastSyncedTimestamp,
            pollbookEvent.timestamp
          ) < 0
        ) {
          lastSyncedTimestamp = pollbookEvent.timestamp;
        }
      }
    });
    return lastSyncedTimestamp;
  }

  private convertRowsToPollbookEvents(rows: EventDbRow[]): PollbookEvent[] {
    return rows
      .map((event) => {
        switch (event.event_type) {
          case EventType.VoterCheckIn: {
            return typedAs<VoterCheckInEvent>({
              type: EventType.VoterCheckIn,
              machineId: event.machine_id,
              voterId: event.voter_id,
              timestamp: {
                physical: event.physical_time,
                logical: event.logical_counter,
                machineId: event.machine_id,
              },
              checkInData: safeParseJson(
                event.event_data,
                VoterCheckInSchema
              ).unsafeUnwrap(),
            });
          }
          case EventType.UndoVoterCheckIn: {
            return typedAs<UndoVoterCheckInEvent>({
              type: EventType.UndoVoterCheckIn,
              machineId: event.machine_id,
              voterId: event.voter_id,
              timestamp: {
                physical: event.physical_time,
                logical: event.logical_counter,
                machineId: event.machine_id,
              },
            });
          }
          default:
            throwIllegalValue(event.event_type);
        }
        return undefined;
      })
      .filter((event) => !!event);
  }

  // Gets the latest event for a voter from the event log, as determined by the vector clock.
  private getLatestEventForVoter(voterId: string): PollbookEvent | undefined {
    const mostRecentEvent = this.client.one(
      'SELECT * FROM event_log WHERE voter_id = ? ORDER BY physical_time DESC, logical_counter DESC, machine_id DESC LIMIT 1',
      voterId
    ) as EventDbRow | undefined;
    if (!mostRecentEvent) {
      return undefined;
    }
    return this.convertRowsToPollbookEvents([mostRecentEvent])[0];
  }

  saveEvent(pollbookEvent: PollbookEvent): boolean {
    try {
      debug('Saving event %o', pollbookEvent);
      this.updateLocalVectorClock(pollbookEvent.timestamp);
      // Check if the event is already saved. If so, do not save it again.
      // All events have a unique (physical_time, logical_counter, machine_id) tuple.
      const existingEvent = this.client.one(
        'SELECT * FROM event_log WHERE physical_time = ? AND logical_counter = ? AND machine_id = ?',
        pollbookEvent.timestamp.physical,
        pollbookEvent.timestamp.logical,
        pollbookEvent.timestamp.machineId
      );
      if (existingEvent) {
        debug('Event already saved, skipping');
        return true;
      }

      switch (pollbookEvent.type) {
        case EventType.VoterCheckIn: {
          const event = pollbookEvent as VoterCheckInEvent;
          // Save the event
          const latestEventForVoter = this.getLatestEventForVoter(
            event.voterId
          );
          this.client.run(
            'INSERT INTO event_log (machine_id, voter_id, event_type, physical_time, logical_counter, event_data) VALUES (?, ?, ?, ?, ?, ?)',
            event.machineId,
            event.voterId,
            event.type,
            event.timestamp.physical,
            event.timestamp.logical,
            JSON.stringify(event.checkInData)
          );

          if (
            latestEventForVoter &&
            HybridLogicalClock.compareHlcTimestamps(
              event.timestamp,
              latestEventForVoter.timestamp
            ) < 0
          ) {
            debug(
              'Not updating check-in status for voter %s, not the latest event',
              event.voterId
            );
            // This is not the latest event we have for this voter, do not update the check-in status.
            return true;
          }
          // Update check-in status
          this.client.run(
            `
              UPDATE voter_check_in_status 
              SET is_checked_in = 1,
                  machine_id = ?,
                  check_in_data = ?
              WHERE voter_id = ?
            `,
            event.machineId,
            JSON.stringify(event.checkInData),
            event.voterId
          );
          return true;
        }
        case EventType.UndoVoterCheckIn: {
          const event = pollbookEvent as UndoVoterCheckInEvent;
          // Save the event
          const latestEventForVoter = this.getLatestEventForVoter(
            event.voterId
          );
          this.client.run(
            'INSERT INTO event_log (machine_id, voter_id, event_type, physical_time, logical_counter, event_data) VALUES (?, ?, ?, ?, ?, ?)',
            event.machineId,
            event.voterId,
            event.type,
            event.timestamp.physical,
            event.timestamp.logical,
            '{}'
          );

          if (
            latestEventForVoter &&
            HybridLogicalClock.compareHlcTimestamps(
              event.timestamp,
              latestEventForVoter.timestamp
            ) < 0
          ) {
            debug(
              'Not updating check-in status for voter %s, not the latest event',
              event.voterId
            );
            // This is not the latest event we have for this voter, do not update the check-in status.
            return true;
          }

          // Update check-in status
          this.client.run(
            `
              UPDATE voter_check_in_status 
              SET is_checked_in = 0,
                  machine_id = NULL,
                  check_in_data = NULL
              WHERE voter_id = ?
            `,
            event.voterId
          );
          return true;
        }
        default: {
          throwIllegalValue(pollbookEvent.type);
        }
      }
    } catch (error) {
      debug('Failed to save event: %s', error);
      return false;
    }
  }

  getElection(): Election | undefined {
    if (!data.election) {
      // Load the election from the database if its not in memory.
      const row = this.client.one(
        `
          select election_data
          from elections
          order by rowid desc
          limit 1
        `
      ) as { election_data: string };
      if (!row) {
        return undefined;
      }
      const election: Election = safeParseJson(
        row.election_data,
        ElectionSchema
      ).unsafeUnwrap();
      data.election = election;
    }
    return data.election;
  }

  setElectionAndVoters(election: Election, voters: Voter[]): void {
    data.election = election;
    data.voters = voters;
    this.client.transaction(() => {
      this.client.run('DELETE FROM voter_check_in_status');
      this.client.run(
        `
          insert into elections (
            election_id,
            election_data
          ) values (
            ?, ?
          )
        `,
        election.id,
        JSON.stringify(election)
      );
      for (const voter of voters) {
        this.client.run(
          `
            insert into voters (
              voter_id,
              voter_data
            ) values (
              ?, ?
            )
          `,
          voter.voterId,
          JSON.stringify(voter)
        );
        this.client.run(
          `
            insert into voter_check_in_status (
              voter_id,
              voter_first_name,
              voter_middle_name,
              voter_last_name,
              is_checked_in
            ) values (
              ?, ?, ?, ?, ?
            )
          `,
          voter.voterId,
          voter.firstName,
          voter.middleName,
          voter.lastName,
          0
        );
      }
    });
    this.applyEventsToVoterCheckInTable();
  }

  deleteElectionAndVoters(): void {
    data.election = undefined;
    data.voters = undefined;
    this.client.transaction(() => {
      this.client.run('delete from elections');
      this.client.run('delete from voters');
      this.client.run('delete from event_log');
      this.client.run('delete from check_in_status');
    });
    data.currentClock = new HybridLogicalClock(this.machineId);
  }

  groupVotersAlphabeticallyByLastName(): Array<Voter[]> {
    const voters = this.getVoters();
    assert(voters);
    return groupBy(voters, (v) => v.lastName[0].toUpperCase()).map(
      ([, voterGroup]) => voterGroup
    );
  }

  getAllVoters(): Array<{
    voterId: string;
    firstName: string;
    lastName: string;
  }> {
    const voters = this.getVoters();
    return (
      voters?.map((v) => ({
        firstName: v.firstName,
        lastName: v.lastName,
        voterId: v.voterId,
      })) ?? []
    );
  }

  searchVoters(searchParams: VoterSearchParams): Voter[] | number {
    const MAX_VOTER_SEARCH_RESULTS = 20;
    const rows = this.client.all(
      `
      SELECT v.voter_data, vc.check_in_data
      FROM voters v
      LEFT JOIN voter_check_in_status vc ON v.voter_id = vc.voter_id
      WHERE vc.voter_last_name LIKE ? AND vc.voter_first_name LIKE ?
      `,
      `${searchParams.lastName.toUpperCase()}%`,
      `${searchParams.firstName.toUpperCase()}%`
    ) as Array<{ voter_data: string; check_in_data: string | null }>;

    if (!rows) {
      return 0;
    }

    const matchingVoters = rows.map((row) => {
      const voter = safeParseJson(row.voter_data, VoterSchema).unsafeUnwrap();
      if (row.check_in_data) {
        voter.checkIn = safeParseJson(
          row.check_in_data,
          VoterCheckInSchema
        ).unsafeUnwrap();
      }
      return voter;
    });

    if (matchingVoters.length > MAX_VOTER_SEARCH_RESULTS) {
      return matchingVoters.length;
    }
    return matchingVoters;
  }

  getCurrentClockTime(): HlcTimestamp {
    if (!data.currentClock) {
      data.currentClock = new HybridLogicalClock(this.machineId);
    }
    return data.currentClock.now();
  }

  recordVoterCheckIn({
    voterId,
    identificationMethod,
  }: {
    voterId: string;
    identificationMethod: VoterIdentificationMethod;
  }): { voter: Voter; count: number } {
    debug('Recording check-in for voter %s', voterId);
    const voters = this.getVoters();
    assert(voters);
    const voter = find(voters, (v) => v.voterId === voterId);
    const timestamp = new Date();
    voter.checkIn = {
      identificationMethod,
      machineId: this.machineId,
      timestamp: timestamp.toISOString(),
    };
    const eventTime = this.incrementClock();
    this.client.transaction(() => {
      assert(voter.checkIn);
      this.saveEvent(
        typedAs<VoterCheckInEvent>({
          type: EventType.VoterCheckIn,
          machineId: this.machineId,
          voterId,
          timestamp: eventTime,
          checkInData: voter.checkIn,
        })
      );
    });
    return { voter, count: this.getCheckInCount() };
  }

  recordUndoVoterCheckIn(voterId: string): Voter {
    debug('Undoing check-in for voter %s', voterId);
    const voters = this.getVoters();
    assert(voters);
    const voter = find(voters, (v) => v.voterId === voterId);
    voter.checkIn = undefined;
    const eventTime = this.incrementClock();
    this.client.transaction(() => {
      this.saveEvent(
        typedAs<UndoVoterCheckInEvent>({
          type: EventType.UndoVoterCheckIn,
          machineId: this.machineId,
          voterId,
          timestamp: eventTime,
        })
      );
    });
    return voter;
  }

  getCheckInCount(machineId?: string): number {
    const query = machineId
      ? `SELECT COUNT(*) as count FROM voter_check_in_status WHERE is_checked_in = 1 AND machine_id = ?`
      : `SELECT COUNT(*) as count FROM voter_check_in_status WHERE is_checked_in = 1`;

    const result = this.client.one(
      query,
      ...(machineId ? [machineId] : [])
    ) as { count: number };
    return result.count;
  }

  // Returns the events that the fromClock does not know about.
  getNewEvents(fromTimestamp: HlcTimestamp): {
    events: PollbookEvent[];
    hasMore: boolean;
  } {
    const LIMIT = 500;

    return this.client.transaction(() => {
      const rows = this.client.all(
        `
        SELECT * FROM event_log 
        WHERE physical_time > ? OR 
          (physical_time = ? AND logical_counter > ?) OR 
          (physical_time = ? AND logical_counter = ? AND machine_id > ?)
        ORDER BY physical_time, logical_counter, machine_id
        LIMIT ?
        `,
        fromTimestamp.physical,
        fromTimestamp.physical,
        fromTimestamp.logical,
        fromTimestamp.physical,
        fromTimestamp.logical,
        fromTimestamp.machineId,
        LIMIT + 1
      ) as EventDbRow[];

      const hasMore = rows.length > LIMIT;
      const eventRows = hasMore ? rows.slice(0, LIMIT) : rows;

      const events = this.convertRowsToPollbookEvents(eventRows);

      return {
        events,
        hasMore,
      };
    });
  }

  getPollbookServicesByName(): Record<string, PollBookService> {
    return data.connectedPollbooks;
  }

  setPollbookServiceForName(
    avahiServiceName: string,
    pollbookService: PollBookService
  ): void {
    data.connectedPollbooks[avahiServiceName] = pollbookService;
  }

  getAllConnectedPollbookServices(): ConnectedPollbookService[] {
    return Object.values(data.connectedPollbooks).filter(
      (service): service is ConnectedPollbookService =>
        service.status === PollbookConnectionStatus.Connected &&
        !!service.apiClient
    );
  }

  cleanupStalePollbookServices(): void {
    for (const [avahiServiceName, pollbookService] of Object.entries(
      data.connectedPollbooks
    )) {
      if (
        Date.now() - pollbookService.lastSeen.getTime() >
        MACHINE_DISCONNECTED_TIMEOUT
      ) {
        debug('Removing stale pollbook service %s', avahiServiceName);
        this.setPollbookServiceForName(avahiServiceName, {
          ...pollbookService,
          status: PollbookConnectionStatus.LostConnection,
          apiClient: undefined,
        });
      }
    }
  }
}
