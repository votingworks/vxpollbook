import path from 'node:path';
import * as builders from '../builders';

export const electionPackage = builders.file(
  'data/electionPrimaryPrecinctSplits/election-package-default-system-settings.zip'
);
// eslint-disable-next-line vx/gts-identifiers, camelcase
export const baseElection_DEPRECATED = builders.election(
  'data/electionPrimaryPrecinctSplits/electionBase.json'
);

// Temporarily export everything other then toElectionPackage until toElectionPackage is formally deprecated
export const {
  readElection,
  readElectionDefinition,
  asBuffer,
  asFilePath,
  asText,
} = builders.election(
  'data/electionPrimaryPrecinctSplits/electionGeneratedWithGridLayoutsMultiLang.json'
);

// Generated by libs/fixture-generators script: pnpm generate-cvr-fixtures
const castVoteRecords = builders.directory(
  'data/electionPrimaryPrecinctSplits/castVoteRecords'
);

export const castVoteRecordExport = {
  asDirectoryPath: () =>
    path.join(
      castVoteRecords.asDirectoryPath(),
      'machine_0000__2024-01-01_00-00-00'
    ),
} as const;