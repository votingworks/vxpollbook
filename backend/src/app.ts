import * as grout from '@votingworks/grout';
import express, { Application } from 'express';
import { Workspace } from './workspace';

function buildApi(workspace: Workspace) {
  const { store } = workspace;

  return grout.createApi({});
}

export type Api = ReturnType<typeof buildApi>;

export function buildApp(workspace: Workspace): Application {
  const app: Application = express();
  const api = buildApi(workspace);
  app.use('/api', grout.buildRouter(api, express));
  app.use(express.static(workspace.assetDirectoryPath));
  return app;
}
