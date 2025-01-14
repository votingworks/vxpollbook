import { Client as DbClient } from '@votingworks/db';
// import { Iso8601Timestamp } from '@votingworks/types';
import { join } from 'node:path';
// import { v4 as uuid } from 'uuid';
import { BaseLogger } from '@votingworks/logging';
import { assert, find, groupBy } from '@votingworks/basics';
import { safeParseJson } from '@votingworks/types';
import { rootDebug } from './debug';
import {
  Election,
  ElectionSchema,
  EventType,
  PollBookService,
  Voter,
  VoterCheckInSchema,
  VoterIdentificationMethod,
  VoterSchema,
  VoterSearchParams,
} from './types';
import { MACHINE_DISCONNECTED_TIMEOUT } from './globals';

const debug = rootDebug;

const data: {
  voters?: Voter[];
  election?: Election;
  connectedPollbooks?: Record<string, PollBookService>;
} = {};

// function convertSqliteTimestampToIso8601(
//   sqliteTimestamp: string
// ): Iso8601Timestamp {
//   return new Date(sqliteTimestamp).toISOString();
// }

const SchemaPath = join(__dirname, '../schema.sql');

export class Store {
  private constructor(private readonly client: DbClient) {}

  getDbPath(): string {
    return this.client.getDatabasePath();
  }

  /**
   * Builds and returns a new store at `dbPath`.
   */
  static fileStore(dbPath: string, logger: BaseLogger): Store {
    return new Store(DbClient.fileClient(dbPath, logger, SchemaPath));
  }

  /**
   * Builds and returns a new store whose data is kept in memory.
   */
  static memoryStore(): Store {
    return new Store(DbClient.memoryClient(SchemaPath));
  }

  private applyEventsToVoters(voters: Voter[]): Voter[] {
    const rows = this.client.all(
      `
      select voter_id, event_type, event_data
      from event_log
      where event_type = ?
      order by timestamp
      `,
      EventType.VoterCheckIn
    ) as Array<{
      voter_id: string;
      event_type: EventType;
      event_data: string;
    }>;
    if (!rows) {
      return voters;
    }
    for (const row of rows) {
      const voter = find(voters, (v) => v.voterId === row.voter_id);
      if (!voter) {
        continue;
      }
      voter.checkIn = safeParseJson(
        row.event_data,
        VoterCheckInSchema
      ).unsafeUnwrap();
    }
    return voters;
  }

  private getVoters(): Voter[] | undefined {
    if (!data.voters) {
      // Load the voters from the database if they are not in memory.
      const rows = this.client.all(
        `
          select voter_data
          from voters
        `
      ) as Array<{ voter_data: string }>;
      if (!rows) {
        return undefined;
      }
      data.voters = rows.map((row) =>
        safeParseJson(row.voter_data, VoterSchema).unsafeUnwrap()
      );
    }
    return this.applyEventsToVoters(data.voters);
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
      this.client.run(
        `
          insert into elections (
            election_data
          ) values (
            ?
          )
        `,
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
      }
    });
  }

  deleteElectionAndVoters(): void {
    data.election = undefined;
    data.voters = undefined;
  }

  groupVotersAlphabeticallyByLastName(): Array<Voter[]> {
    const voters = this.getVoters();
    assert(voters);
    return groupBy(voters, (v) => v.lastName[0].toUpperCase()).map(
      ([, voterGroup]) => voterGroup
    );
  }

  searchVoters(searchParams: VoterSearchParams): Voter[] | number {
    const voters = this.getVoters();
    assert(voters);
    const MAX_VOTER_SEARCH_RESULTS = 20;
    const matchingVoters = voters.filter(
      (voter) =>
        voter.lastName
          .toUpperCase()
          .startsWith(searchParams.lastName.toUpperCase()) &&
        voter.firstName
          .toUpperCase()
          .startsWith(searchParams.firstName.toUpperCase())
    );
    if (matchingVoters.length > MAX_VOTER_SEARCH_RESULTS) {
      return matchingVoters.length;
    }
    return matchingVoters;
  }

  recordVoterCheckIn({
    voterId,
    identificationMethod,
    machineId,
    timestamp,
  }: {
    voterId: string;
    identificationMethod: VoterIdentificationMethod;
    machineId: string;
    timestamp: Date;
  }): { voter: Voter; count: number } {
    const voters = this.getVoters();
    assert(voters);
    const voter = find(voters, (v) => v.voterId === voterId);
    voter.checkIn = {
      timestamp: timestamp.toISOString(),
      identificationMethod,
      machineId,
    };
    this.client.run(
      'INSERT INTO event_log (machine_id, voter_id, event_type, event_data) VALUES (?, ?, ?, ?)',
      machineId,
      voterId,
      EventType.VoterCheckIn,
      JSON.stringify(voter.checkIn)
    );
    return { voter, count: this.getCheckInCount() };
  }

  recordUndoVoterCheckIn(voterId: string): Voter {
    assert(data.voters);
    const voter = find(data.voters, (v) => v.voterId === voterId);
    voter.checkIn = undefined;
    // TODO CARO implement
    return voter;
  }

  getCheckInCount(machineId?: string): number {
    const voters = this.getVoters();
    assert(voters);
    return voters.filter(
      (voter) =>
        voter.checkIn && (!machineId || voter.checkIn.machineId === machineId)
    ).length;
  }

  getPollbookServiceForName(
    avahiServiceName: string
  ): PollBookService | undefined {
    return data.connectedPollbooks?.[avahiServiceName];
  }

  setPollbookServiceForName(
    avahiServiceName: string,
    pollbookService: PollBookService
  ): void {
    if (!data.connectedPollbooks) {
      data.connectedPollbooks = {};
    }
    data.connectedPollbooks[avahiServiceName] = pollbookService;
  }

  getAllConnectedPollbookServices(): PollBookService[] {
    if (!data.connectedPollbooks) {
      return [];
    }
    return Object.values(data.connectedPollbooks);
  }

  cleanupStalePollbookServices(): void {
    if (!data.connectedPollbooks) {
      return;
    }
    for (const [avahiServiceName, pollbookService] of Object.entries(
      data.connectedPollbooks
    )) {
      if (
        Date.now() - pollbookService.lastSeen.getTime() >
        MACHINE_DISCONNECTED_TIMEOUT
      ) {
        debug(
          'Cleaning up stale pollbook service for machineId %s',
          pollbookService.machineId
        );
        delete data.connectedPollbooks[avahiServiceName];
      }
    }
  }
}
