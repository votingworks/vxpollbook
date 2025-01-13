import { Client as DbClient } from '@votingworks/db';
// import { Iso8601Timestamp } from '@votingworks/types';
import { join } from 'node:path';
// import { v4 as uuid } from 'uuid';
import { BaseLogger } from '@votingworks/logging';
import { assert, find, groupBy } from '@votingworks/basics';
import { rootDebug } from './debug';
import {
  ElectionConfiguration,
  PollBookService,
  Voter,
  VoterIdentificationMethod,
  VoterSearchParams,
} from './types';
import { MACHINE_DISCONNECTED_TIMEOUT } from './globals';

const debug = rootDebug;

const data: {
  voters?: Voter[];
  electionConfiguration?: ElectionConfiguration;
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

  getElectionConfiguration(): ElectionConfiguration | undefined {
    return data.electionConfiguration;
  }

  setElectionAndVoters(
    electionConfiguration: ElectionConfiguration,
    voters: Voter[]
  ): void {
    data.electionConfiguration = electionConfiguration;
    data.voters = voters;
  }

  groupVotersAlphabeticallyByLastName(): Array<Voter[]> {
    assert(data.voters);
    return groupBy(data.voters, (v) => v.lastName[0].toUpperCase()).map(
      ([, voterGroup]) => voterGroup
    );
  }

  searchVoters(searchParams: VoterSearchParams): Voter[] | number {
    assert(data.voters);
    const MAX_VOTER_SEARCH_RESULTS = 20;
    const matchingVoters = data.voters.filter(
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

  recordVoterCheckIn(
    voterId: string,
    identificationMethod: VoterIdentificationMethod,
    machineId: string
  ): void {
    assert(data.voters);
    const voter = find(data.voters, (v) => v.voterId === voterId);
    voter.checkIn = {
      timestamp: new Date().toISOString(),
      identificationMethod,
      machineId,
    };
  }

  getCheckInCount(machineId?: string): number {
    assert(data.voters);
    return data.voters.filter(
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
