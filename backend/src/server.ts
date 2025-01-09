import { buildApp } from './app';
import { PORT } from './globals';
import { Workspace } from './workspace';

/**
 * Starts the server.
 */
export function start({ workspace }: { workspace: Workspace }): void {
  const app = buildApp(workspace, process.env.MACHINE_ID || '0000');

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`VxPollbook backend running at http://localhost:${PORT}/`);
  });
}
