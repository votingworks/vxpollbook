import * as grout from '@votingworks/grout';
import express, { Application } from 'express';
import { sleep } from '@votingworks/basics';
import fetch from 'node-fetch';
import { Workspace } from './workspace';
import { Voter, VoterIdentificationMethod, VoterSearchParams } from './types';
import { AVAILABLE_IP_ADDRESSES } from './globals';

// TODO read machine ID from env or network
const machineId = 'placeholder-machine-id';

export function createApiClientForStaticIp(
  ipAddress: string
): grout.Client<Api> {
  return grout.createClient<Api>({ baseUrl: `${ipAddress}/api` });
}

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

    heartbeat(): string {
      return machineId;
    },

    async syncConnections(): Promise<void> {
      console.log('attempting to sync');
      for (const ipAddress of AVAILABLE_IP_ADDRESSES) {
        try {
          const apiClient = createApiClientForStaticIp(ipAddress);
          const seenMachineId = apiClient.heartbeat();
          
          knownMachineIds.set(seenMachineId, new Date());
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
  // set up a interval to call syncConnections every 5 seconds
  setInterval(() => {
    void api.syncConnections();
  }, 5000);
  return app;
}
