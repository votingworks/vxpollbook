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
  VectorClock,
  VectorClockSchema,
} from './types';
import { MACHINE_DISCONNECTED_TIMEOUT } from './globals';
import { mergeVectorClocks, compareVectorClocks } from './vector_clock';

const debug = rootDebug;

const data: {
  voters?: Voter[];
  election?: Election;
  connectedPollbooks: Record<string, PollBookService>;
  vectorClock: VectorClock;
  isOnline: boolean;
} = {
  connectedPollbooks: {},
  vectorClock: {},
  isOnline: false,
};

const SchemaPath = join(__dirname, '../schema.sql');

export function comparePollbookEvents(
  a: PollbookEvent,
  b: PollbookEvent
): number {
  const clockComparison = compareVectorClocks(a.vectorClock, b.vectorClock);
  if (clockComparison !== 0) {
    return clockComparison;
  }
  // Tie breaker for concurrent events use system timestamps.
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}

export class Store {
  private constructor(
    private readonly client: DbClient,
    private readonly machineId: string
  ) {}

  // Increments the vector clock for the current machine and returns the new value.
  // This function MUST be called before saving an event for the current machine.
  private incrementVectorClock(): number {
    if (!data.vectorClock[this.machineId]) {
      data.vectorClock[this.machineId] = 0;
    }
    data.vectorClock[this.machineId] += 1;
    return data.vectorClock[this.machineId];
  }

  private updateLocalVectorClock(remoteClock: VectorClock) {
    data.vectorClock = mergeVectorClocks(data.vectorClock, remoteClock);
  }

  private applyEventsToVoterCheckInTable(): void {
    this.client.transaction(() => {
      // Apply all events in order to build initial state
      const rows = this.client.all(
        `
        SELECT * FROM event_log 
        WHERE event_type IN (?, ?)
        ORDER BY timestamp
      `,
        EventType.VoterCheckIn,
        EventType.UndoVoterCheckIn
      ) as EventDbRow[];

      const orderedEvents = this.getOrderedEventsFromDbRows(rows);

      for (const event of orderedEvents) {
        switch (event.type) {
          case EventType.VoterCheckIn: {
            this.client.run(
              `
            UPDATE voter_check_in_status 
            SET is_checked_in = 1,
                machine_id = ?,
                check_in_timestamp = ?
                check_in_data = ?
            WHERE voter_id = ?
          `,
              event.machineId,
              event.timestamp,
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
                machine_id = NULL,
                check_in_timestamp = NULL
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

  saveEvents(pollbookEvents: PollbookEvent[]): boolean {
    let isSuccess = true;
    this.client.transaction(() => {
      for (const pollbookEvent of pollbookEvents) {
        isSuccess = isSuccess && this.saveEvent(pollbookEvent);
      }
    });
    return isSuccess;
  }

  private getOrderedEventsFromDbRows(rows: EventDbRow[]): PollbookEvent[] {
    const pollbookEvents: PollbookEvent[] = rows
      .map((event) => {
        switch (event.event_type) {
          case EventType.VoterCheckIn: {
            return typedAs<VoterCheckInEvent>({
              type: EventType.VoterCheckIn,
              eventId: event.event_id,
              machineId: event.machine_id,
              voterId: event.voter_id,
              timestamp: event.timestamp,
              checkInData: safeParseJson(
                event.event_data,
                VoterCheckInSchema
              ).unsafeUnwrap(),
              vectorClock: safeParseJson(
                event.vector_clock,
                VectorClockSchema
              ).unsafeUnwrap(),
            });
          }
          case EventType.UndoVoterCheckIn: {
            return typedAs<UndoVoterCheckInEvent>({
              type: EventType.UndoVoterCheckIn,
              eventId: event.event_id,
              machineId: event.machine_id,
              voterId: event.voter_id,
              timestamp: event.timestamp,
              vectorClock: safeParseJson(
                event.vector_clock,
                VectorClockSchema
              ).unsafeUnwrap(),
            });
          }
          default:
            throwIllegalValue(event.event_type);
        }
        return undefined;
      })
      .filter((event) => !!event);

    // Order events by the vector clocks, concurrent events are ordered by machine_id.
    const orderedEvents = [...pollbookEvents].sort(comparePollbookEvents);

    return orderedEvents;
  }

  // Gets the latest event for a voter from the event log, as determined by the vector clock.
  private getLatestEventForVoter(voterId: string): PollbookEvent | undefined {
    const rows = this.client.all(
      'SELECT * FROM event_log WHERE voter_id = ? ORDER BY timestamp DESC LIMIT 1',
      voterId
    ) as EventDbRow[];
    const orderedEvents = this.getOrderedEventsFromDbRows(rows);
    return orderedEvents[0] || undefined;
  }

  saveEvent(pollbookEvent: PollbookEvent): boolean {
    try {
      debug('Saving event %o', pollbookEvent);
      this.updateLocalVectorClock(pollbookEvent.vectorClock);

      switch (pollbookEvent.type) {
        case EventType.VoterCheckIn: {
          const event = pollbookEvent as VoterCheckInEvent;
          this.client.transaction(() => {
            // Save the event
            this.client.run(
              'INSERT INTO event_log (event_id, machine_id, voter_id, event_type, timestamp, event_data, vector_clock) VALUES (?, ?, ?, ?, ?, ?, ?)',
              event.eventId,
              event.machineId,
              event.voterId,
              event.type,
              event.timestamp,
              JSON.stringify(event.checkInData),
              JSON.stringify(event.vectorClock)
            );

            const latestEventForVoter = this.getLatestEventForVoter(
              event.voterId
            );
            if (
              latestEventForVoter &&
              comparePollbookEvents(latestEventForVoter, event) > 0
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
                  check_in_timestamp = ?,
                  check_in_data = ?
              WHERE voter_id = ?
            `,
              event.machineId,
              event.timestamp,
              JSON.stringify(event.checkInData),
              event.voterId
            );
          });
          return true;
        }
        case EventType.UndoVoterCheckIn: {
          const event = pollbookEvent as UndoVoterCheckInEvent;
          this.client.transaction(() => {
            // Save the event
            this.client.run(
              'INSERT INTO event_log (event_id, machine_id, voter_id, event_type, timestamp, event_data, vector_clock) VALUES (?, ?, ?, ?, ?, ?, ?)',
              event.eventId,
              event.machineId,
              event.voterId,
              event.type,
              event.timestamp,
              '{}',
              JSON.stringify(event.vectorClock)
            );

            const latestEventForVoter = this.getLatestEventForVoter(
              event.voterId
            );
            if (
              latestEventForVoter &&
              comparePollbookEvents(latestEventForVoter, event) > 0
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
                  check_in_data = NULL,
                  check_in_timestamp = NULL
              WHERE voter_id = ?
            `,
              event.voterId
            );
          });
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
    });
    data.vectorClock = {};
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

  getCurrentClock(): VectorClock {
    return data.vectorClock;
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
    const eventId = this.incrementVectorClock();
    this.saveEvent(
      typedAs<VoterCheckInEvent>({
        type: EventType.VoterCheckIn,
        eventId,
        machineId: this.machineId,
        voterId,
        timestamp: timestamp.toISOString(),
        checkInData: voter.checkIn,
        vectorClock: data.vectorClock,
      })
    );
    return { voter, count: this.getCheckInCount() };
  }

  recordUndoVoterCheckIn(voterId: string): Voter {
    const voters = this.getVoters();
    assert(voters);
    const voter = find(voters, (v) => v.voterId === voterId);
    voter.checkIn = undefined;
    const eventId = this.incrementVectorClock();
    const timestamp = new Date();
    this.saveEvent(
      typedAs<UndoVoterCheckInEvent>({
        type: EventType.UndoVoterCheckIn,
        eventId,
        machineId: this.machineId,
        voterId,
        timestamp: timestamp.toISOString(),
        vectorClock: data.vectorClock,
      })
    );
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
  getNewEvents(fromClock: VectorClock): PollbookEvent[] {
    const machineIds = Object.keys(fromClock);
    const placeholders = machineIds.map(() => '?').join(', ');
    // Query for all events from unknown machines.
    const unknownMachineQuery = `
      SELECT event_id, machine_id, voter_id, event_type, timestamp, vector_clock, event_data
      FROM event_log
      WHERE machine_id NOT IN (${placeholders})
      ORDER BY timestamp
    `;
    // Query for recent events from known machines
    const knownMachineQuery = `
      SELECT event_id, machine_id, voter_id, event_type, timestamp, vector_clock, event_data
      FROM event_log
      WHERE (${machineIds
        .map(() => `( machine_id = ? AND event_id > ? )`)
        .join(' OR ')})
      ORDER BY timestamp
    `;
    const queryParams = [...machineIds.flatMap((id) => [id, fromClock[id]])];

    return this.client.transaction(() => {
      const rowsForMissingMachines = this.client.all(
        unknownMachineQuery,
        ...machineIds
      ) as EventDbRow[];
      const rowsForKnownMachines =
        machineIds.length > 0
          ? (this.client.all(knownMachineQuery, ...queryParams) as EventDbRow[])
          : [];
      const events: PollbookEvent[] = [];
      for (const row of [...rowsForMissingMachines, ...rowsForKnownMachines]) {
        switch (row.event_type) {
          case EventType.VoterCheckIn: {
            events.push(
              typedAs<VoterCheckInEvent>({
                type: EventType.VoterCheckIn,
                eventId: row.event_id,
                machineId: row.machine_id,
                timestamp: row.timestamp,
                voterId: row.voter_id,
                checkInData: safeParseJson(
                  row.event_data,
                  VoterCheckInSchema
                ).unsafeUnwrap(),
                vectorClock: safeParseJson(
                  row.vector_clock,
                  VectorClockSchema
                ).unsafeUnwrap(),
              })
            );
            break;
          }
          case EventType.UndoVoterCheckIn: {
            events.push(
              typedAs<UndoVoterCheckInEvent>({
                type: EventType.UndoVoterCheckIn,
                eventId: row.event_id,
                machineId: row.machine_id,
                timestamp: row.timestamp,
                voterId: row.voter_id,
                vectorClock: safeParseJson(
                  row.vector_clock,
                  VectorClockSchema
                ).unsafeUnwrap(),
              })
            );
            break;
          }
          default: {
            throwIllegalValue(row.event_type);
          }
        }
      }
      return events;
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
