import React, { useState } from 'react';
import { ok, throwIllegalValue } from '@votingworks/basics';
import { Button, Loading, Modal, P } from '@votingworks/ui';
import { getDeviceStatuses, exportVoterActivity } from './api';

export function ExportVoterActivityModal({
  onClose,
}: {
  onClose: () => void;
}): JSX.Element | null {
  const getDeviceStatusesQuery = getDeviceStatuses.useQuery();
  const exportVoterActivityMutation = exportVoterActivity.useMutation();

  if (!getDeviceStatusesQuery.isSuccess) {
    return null;
  }

  const { usbDrive } = getDeviceStatusesQuery.data;

  switch (exportVoterActivityMutation.status) {
    case 'idle': {
      if (usbDrive.status === 'mounted') {
        return (
          <Modal
            title="Export Voter Activity"
            content={
              <P>Voter activity will be exported to the inserted USB drive.</P>
            }
            onOverlayClick={onClose}
            actions={
              <React.Fragment>
                <Button
                  icon="Export"
                  variant="primary"
                  onPress={() => exportVoterActivityMutation.mutate()}
                >
                  Export
                </Button>
                <Button onPress={onClose}>Cancel</Button>
              </React.Fragment>
            }
          />
        );
      }
      return (
        <Modal
          title="No USB Drive Detected"
          content={<P>Insert a USB drive to export voter activity.</P>}
          onOverlayClick={onClose}
          actions={<Button onPress={onClose}>Cancel</Button>}
        />
      );
    }

    case 'loading':
      return <Modal content={<Loading>Exporting Voter Activity</Loading>} />;

    case 'success':
      return (
        <Modal
          title="Voter Activity Exported"
          content={<P>Voter activity exported to the inserted USB drive.</P>}
          onOverlayClick={onClose}
          actions={<Button onPress={onClose}>Close</Button>}
        />
      );

    case 'error':
      return (
        <Modal
          title="Failed to Export Voter Activity"
          content={<P>Failed to export voter activity to the USB drive.</P>}
          onOverlayClick={onClose}
          actions={<Button onPress={onClose}>Close</Button>}
        />
      );

    default: {
      /* istanbul ignore next - @preserve */
      throwIllegalValue(exportVoterActivityMutation);
    }
  }
}

export function ExportVoterActivityButton(): JSX.Element {
  const [isShowingModal, setIsShowingModal] = useState(false);

  return (
    <React.Fragment>
      <Button
        icon="Export"
        color="primary"
        onPress={() => setIsShowingModal(true)}
      >
        Export Voter Activity
      </Button>
      {isShowingModal && (
        <ExportVoterActivityModal onClose={() => setIsShowingModal(false)} />
      )}
    </React.Fragment>
  );
}
