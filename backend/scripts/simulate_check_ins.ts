import * as grout from '@votingworks/grout';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { Api } from '../src/app';

const api = grout.createClient<Api>({
  baseUrl: 'http://localhost:3002/api',
});

async function getAllVoters() {
  try {
    const response = await api.getAllVoters();
    return response;
  } catch (error) {
    console.error('Failed to fetch voters:', error);
    return []; // Return an empty array if offline
  }
}

async function checkInVoter(voterId: string) {
  try {
    await api.checkInVoter({
      voterId,
      identificationMethod: {
        type: 'photoId',
        state: 'CA',
      },
    });
  } catch (error) {
    console.error(`Failed to check in voter ${voterId}:`, error);
  }
}

function isVoterInRange(voter: { lastName: string }, range: string): boolean {
  const [start, end] = range.split('-').map((char) => char.toUpperCase());
  const lastNameInitial = voter.lastName[0].toUpperCase();
  return lastNameInitial >= start && lastNameInitial <= end;
}

async function checkInAllVotersOnCurrentMachine(
  limit?: number,
  range?: string,
  slow?: boolean
) {
  try {
    console.log('Starting check-in simulation...');
    let voters = await getAllVoters();

    if (range) {
      voters = voters.filter((voter) => isVoterInRange(voter, range));
    }

    const sortedVoters = [...voters].sort((a, b) => {
      const lastNameComparison = a.lastName.localeCompare(b.lastName);
      return lastNameComparison !== 0
        ? lastNameComparison
        : a.firstName.localeCompare(b.firstName);
    });

    const votersToProcess = limit ? sortedVoters.slice(0, limit) : sortedVoters;
    console.log(
      `Found ${sortedVoters.length} voters, will process ${votersToProcess.length}`
    );

    let processed = 0;
    for (const voter of votersToProcess) {
      if (slow) {
        console.log('checking in voter', voter);
      }
      await checkInVoter(voter.voterId);
      processed += 1;

      if (processed % 100 === 0) {
        console.log(`Processed ${processed} voters`);
      }

      if (slow) {
        const delay = Math.floor(Math.random() * 20000) + 20000; // Random delay between 4 and 8 seconds
        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
      }
    }

    console.log('Simulation completed!');
  } catch (error) {
    console.error('Simulation failed:', error);
  }
}

interface SimulateScriptArguments {
  limit?: number;
  range?: string;
  checkResults: boolean;
  slow: boolean;
}

export async function main(argv: string[]): Promise<number> {
  // Parse command line arguments using yargs
  const parser = yargs()
    .strict()
    .exitProcess(false)
    .options({
      limit: {
        type: 'number',
        alias: 'l',
        description: 'Limit the number of voters to check in',
      },
      range: {
        type: 'string',
        alias: 'r',
        description: 'Specify a range of letters for last names (e.g., A-D)',
      },
      slow: {
        type: 'boolean',
        description: 'Enable slow mode with random delays between check-ins',
        default: false,
      },
      checkResults: {
        type: 'boolean',
        description: 'Give stats on the voters checked in',
        default: false,
      },
    })
    .help();
  const args = (await parser.parse(hideBin(argv))) as SimulateScriptArguments;

  const { limit, slow, checkResults } = args;

  if (checkResults) {
    // ...existing code to initialize store if necessary...
    const voters = await getAllVoters();
    const checkedInVoters = voters.filter((v) => v.checkIn);
    const totalCheckedIn = checkedInVoters.length;

    const freq: Record<number, number> = {};
    for (const v of checkedInVoters) {
      if (v.checkIn) {
        const num = v.checkIn.checkInNumber;
        freq[num] = (freq[num] || 0) + 1;
      }
    }
    const uniqueCheckInNumbers = Object.keys(freq).length;
    let duplicateCount = 0;
    for (const k of Object.keys(freq)) {
      if (freq[k as unknown as number] > 1) {
        duplicateCount += 1;
      }
    }

    console.log('Total checked in voters:', totalCheckedIn);
    console.log('Total unique checkInNumber values:', uniqueCheckInNumbers);
    console.log('Total voters with duplicated checkInNumber:', duplicateCount);
    return 0;
  }

  const range =
    args.range && /^[A-Z]-[A-Z]$/i.test(args.range) ? args.range : undefined;

  await checkInAllVotersOnCurrentMachine(limit, range, slow);
  return 0;
}
