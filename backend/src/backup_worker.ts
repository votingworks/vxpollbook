/* eslint-disable no-console */
import React from 'react';
import { join } from 'node:path';
import { exists, move } from 'fs-extra';
import {
  ExportableData,
  ExportDataResult,
  Exporter,
} from '@votingworks/backend';
import { setInterval } from 'node:timers/promises';
import { renderToPdf } from '@votingworks/printing';
import { Workspace } from './workspace';
import { VoterChecklist } from './voter_checklist';

/**
 * Save a file to disk.
 */
export function exportFile({
  path,
  data,
}: {
  path: string;
  data: ExportableData;
}): Promise<ExportDataResult> {
  const exporter = new Exporter({
    allowedExportPatterns: ['**'], // TODO restrict allowed export paths
    /* We're not using `exportDataToUsbDrive` here, so a mock `usbDrive` is OK */
    usbDrive: {
      status:
        /* istanbul ignore next */
        () =>
          Promise.resolve({
            status: 'no_drive',
          }),

      eject:
        /* istanbul ignore next */
        () => Promise.resolve(),
      format:
        /* istanbul ignore next */
        () => Promise.resolve(),
      sync:
        /* istanbul ignore next */
        () => Promise.resolve(),
    },
  });

  return exporter.exportData(path, data);
}

async function exportBackupVoterChecklist(workspace: Workspace): Promise<void> {
  const checklistElement = React.createElement(VoterChecklist, {
    voters: workspace.store.listVoters(),
  });
  const latestBackupPath = join(
    workspace.assetDirectoryPath,
    'latest_backup_voter_checklist.pdf'
  );
  const previousBackupPath = join(
    workspace.assetDirectoryPath,
    'previous_backup_voter_checklist.pdf'
  );
  if (await exists(latestBackupPath)) {
    await move(latestBackupPath, previousBackupPath, { overwrite: true });
  }
  const pdf = (
    await renderToPdf({
      document: checklistElement,
      landscape: true,
      marginDimensions: {
        top: 0.25,
        right: 0.25,
        bottom: 0.25,
        left: 0.25,
      },
    })
  ).unsafeUnwrap();
  (await exportFile({ path: latestBackupPath, data: pdf })).unsafeUnwrap();
}

const BACKUP_INTERVAL = 1_000 * 60; // 1 minute

export function start({ workspace }: { workspace: Workspace }): void {
  console.log('Starting VxPollbook backup worker');
  process.nextTick(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of setInterval(BACKUP_INTERVAL)) {
      console.log('Exporting backup voter checklist');
      console.time('Exported backup voter checklist');
      await exportBackupVoterChecklist(workspace);
      console.timeEnd('Exported backup voter checklist');
    }
  });
}
