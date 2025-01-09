import * as grout from '@votingworks/grout';
import express, { Application } from 'express';
import { sleep } from '@votingworks/basics';
import fetch from 'node-fetch';
import { Workspace } from './workspace';
import { Voter, VoterIdentificationMethod, VoterSearchParams } from './types';
import { AVAILABLE_IP_ADDRESSES } from './globals';

// TODO read machine ID from env or network
const machineId = 'placeholder-machine-id';

function buildApi(workspace: Workspace) {
  const { store } = workspace;
  const knownMachineIds = new Map<string, Date>();

  return grout.createApi({
    searchVoters(input: {
      searchParams: VoterSearchParams;
    }): Voter[] | number | null {
      const { searchParams } = input;
      if (Object.values(searchParams).every((value) => value === '')) {
        return null;
      }

      return store.searchVoters(searchParams);
    },

    async checkInVoter(input: {
      voterId: string;
      identificationMethod: VoterIdentificationMethod;
    }): Promise<boolean> {
      store.recordVoterCheckIn(
        input.voterId,
        input.identificationMethod,
        machineId
      );

      // TODO print voter receipt
      await sleep(2000);

      return true; // Successfully checked in and printed receipt
    },

    getCheckInCounts(): { thisMachine: number; allMachines: number } {
      return {
        thisMachine: store.getCheckInCount(machineId),
        allMachines: store.getCheckInCount(),
      };
    },

    heartbeat(): boolean {
      return true;
    },

    async syncConnections(): Promise<void> {
      console.log('attempting to sync');
      for (const ipAddress of AVAILABLE_IP_ADDRESSES) {
        // Call the /heartbeat endpoint on each IP address at port 3002
        // If you get a response of true, add the IP address to the list of connected machines with the current last seen time.
        // Otherwise ignore it.
        try {
          const response = await fetch(
            `http://${ipAddress}:3002/api/heartbeat`
          );
          const isAlive = await response.json();
          if (isAlive) {
            knownMachineIds.set(ipAddress, new Date());
          }
        } catch (error) {
          // Ignore errors, machine is considered not connected
        }
      }
      console.log(knownMachineIds);
    },
  });
}

export type Api = ReturnType<typeof buildApi>;

export function buildApp(workspace: Workspace): Application {
  const app: Application = express();
  const api = buildApi(workspace);
  app.use('/api', grout.buildRouter(api, express));
  app.use(express.static(workspace.assetDirectoryPath));
  app.get('/heartbeat', (_req, res) => res.send(true));
  // set up a interval to call syncConnections every 5 seconds
  setInterval(() => {
    void api.syncConnections();
  }, 5000);
  return app;
}
