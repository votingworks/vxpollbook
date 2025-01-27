import * as grout from '@votingworks/grout';
import type { Api } from '../src/app';

const api = grout.createClient<Api>({
  baseUrl: 'http://localhost:3002/api',
});

async function getAllVoters() {
  const response = await api.getAllVoters();
  return response;
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

async function checkInAllVotersOnCurrentMachine() {
  try {
    console.log('Starting check-in simulation...');
    const voters = await getAllVoters();
    console.log(`Found ${voters.length} voters`);

    for (const voter of voters) {
      await checkInVoter(voter.voterId);
      // Add a small delay between check-ins to make it more realistic
    }

    console.log('Simulation completed!');
  } catch (error) {
    console.error('Simulation failed:', error);
  }
}

void checkInAllVotersOnCurrentMachine();
