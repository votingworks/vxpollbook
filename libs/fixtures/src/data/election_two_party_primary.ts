import path from 'node:path';
import { Election, ElectionDefinition } from '@votingworks/types';
import * as builders from '../builders';
import { asElectionDefinition } from '../util';

export const makeBatchCsvData = builders.file(
  'data/electionTwoPartyPrimary/csvFiles/batchResults.csv'
).asText;
export const makeFinalCsvData = builders.file(
  'data/electionTwoPartyPrimary/csvFiles/finalResults.csv'
).asText;

export const electionJson = builders.election(
  'data/electionTwoPartyPrimary/election.json'
);
export const { readElection, readElectionDefinition } = electionJson;

export function makeSinglePrecinctElection(): Election {
  const election = electionJson.readElection();
  return {
    ...election,
    precincts: [election.precincts[0]],
    ballotStyles: election.ballotStyles.map((ballotStyle) => ({
      ...ballotStyle,
      precincts: [election.precincts[0].id],
    })),
  };
}

export function makeSinglePrecinctElectionDefinition(): ElectionDefinition {
  return asElectionDefinition(makeSinglePrecinctElection());
}

export const systemSettings = builders.file('data/systemSettings.json');

// Generated by libs/fixture-generators script: pnpm generate-cvr-fixtures
const castVoteRecords = builders.directory(
  'data/electionTwoPartyPrimary/castVoteRecords'
);
export const castVoteRecordExport = {
  asDirectoryPath: () =>
    path.join(
      castVoteRecords.asDirectoryPath(),
      'machine_0000__2024-01-01_00-00-00'
    ),
} as const;
