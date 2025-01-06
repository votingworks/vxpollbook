import { useState } from 'react';
import { Voter } from './types';
import { throwIllegalValue } from '@votingworks/basics';
import { VoterSearchScreen } from './voter_search_screen';
import { VoterConfirmScreen } from './voter_confirm_screen';
import { NoNavScreen } from './nav_screen';
import {
  Button,
  FullScreenIconWrapper,
  FullScreenMessage,
  H1,
  Icons,
} from '@votingworks/ui';
import { Column } from './layout';

type CheckInFlowState =
  | { step: 'search' }
  | { step: 'confirm'; voter: Voter }
  | { step: 'printing'; voter: Voter }
  | { step: 'success'; voter: Voter };

export function PollWorkerScreen(): JSX.Element {
  const [flowState, setFlowState] = useState<CheckInFlowState>({
    step: 'search',
  });
  switch (flowState.step) {
    case 'search':
      return (
        <VoterSearchScreen
          onSelect={(voter) => setFlowState({ step: 'confirm', voter })}
        />
      );

    case 'confirm':
      return (
        <VoterConfirmScreen
          voter={flowState.voter}
          onCancel={() => setFlowState({ step: 'search' })}
          onConfirm={() =>
            setFlowState({ step: 'printing', voter: flowState.voter })
          }
        />
      );

    case 'printing':
      setTimeout(() => {
        setFlowState({ step: 'success', voter: flowState.voter });
      }, 2000);
      return (
        <NoNavScreen>
          <Column style={{ justifyContent: 'center', flex: 1 }}>
            <FullScreenMessage
              title="Printing voter receipt…"
              image={
                <FullScreenIconWrapper>
                  <Icons.Loading />
                </FullScreenIconWrapper>
              }
            />
          </Column>
        </NoNavScreen>
      );

    case 'success':
      return (
        <NoNavScreen>
          <Column style={{ justifyContent: 'center', flex: 1 }}>
            <FullScreenMessage
              title={null}
              image={
                <FullScreenIconWrapper>
                  <Icons.Done color="primary" />
                </FullScreenIconWrapper>
              }
            >
              <H1>
                {flowState.voter.firstName} {flowState.voter.lastName} is
                checked in
              </H1>
              <p>Give the voter their receipt.</p>
              <Button
                onPress={() => setFlowState({ step: 'search' })}
                rightIcon="Next"
                variant="primary"
              >
                Search for Next Voter
              </Button>
            </FullScreenMessage>
          </Column>
        </NoNavScreen>
      );

    default:
      throwIllegalValue(flowState);
  }
}
