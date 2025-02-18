import { MainContent, Button, Font, Icons } from '@votingworks/ui';
import { undoVoterCheckIn } from './api';
import { Column, Row } from './layout';
import { ElectionManagerNavScreen } from './nav_screen';
import { VoterSearch, CheckInDetails } from './voter_search_screen';

export function VotersScreen(): JSX.Element {
  const undoVoterCheckInMutation = undoVoterCheckIn.useMutation();
  return (
    <ElectionManagerNavScreen title="Voters">
      <MainContent>
        <VoterSearch
          renderAction={(voter) =>
            voter.checkIn ? (
              <Column style={{ gap: '0.5rem' }}>
                <CheckInDetails checkIn={voter.checkIn} />
                <Button
                  style={{ flexWrap: 'nowrap' }}
                  icon="Delete"
                  color="danger"
                  onPress={() => {
                    undoVoterCheckInMutation.mutate({ voterId: voter.voterId });
                  }}
                >
                  <Font noWrap>Undo Check-In</Font>
                </Button>
              </Column>
            ) : (
              <Row style={{ gap: '0.5rem' }}>
                <Font noWrap>
                  <Icons.X /> Not Checked In
                </Font>
              </Row>
            )
          }
        />
      </MainContent>
    </ElectionManagerNavScreen>
  );
}
