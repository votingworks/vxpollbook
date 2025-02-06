import { useState } from 'react';
import { throwIllegalValue } from '@votingworks/basics';
import type { Voter, VoterRegistration } from '@votingworks/pollbook-backend';
import {
  Button,
  ButtonBar,
  FullScreenIconWrapper,
  FullScreenMessage,
  H1,
  Icons,
  MainHeader,
} from '@votingworks/ui';
import { Redirect, Route, Switch } from 'react-router-dom';
import { VoterSearchScreen } from './voter_search_screen';
import { VoterConfirmScreen } from './voter_confirm_screen';
import {
  NoNavScreen,
  PollWorkerNavScreen,
  pollWorkerRoutes,
} from './nav_screen';
import { Column } from './layout';
import { checkInVoter, getDeviceStatuses, registerVoter } from './api';
import { AddVoterScreen } from './add_voter_screen';

type CheckInFlowState =
  | { step: 'search' }
  | { step: 'confirm'; voter: Voter }
  | { step: 'printing'; voter: Voter }
  | { step: 'success'; voter: Voter };

export function VoterCheckInScreen(): JSX.Element | null {
  const [flowState, setFlowState] = useState<CheckInFlowState>({
    step: 'search',
  });
  const checkInVoterMutation = checkInVoter.useMutation();

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
          onConfirm={(identificationMethod) => {
            setFlowState({ step: 'printing', voter: flowState.voter });
            checkInVoterMutation.mutate(
              { voterId: flowState.voter.voterId, identificationMethod },
              {
                onSuccess: () =>
                  setFlowState({
                    step: 'success',
                    voter: flowState.voter,
                  }),
              }
            );
          }}
        />
      );

    case 'printing':
      return (
        <NoNavScreen>
          <MainHeader>
            <H1>Check In Voter</H1>
          </MainHeader>
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
          <MainHeader>
            <H1>Voter Checked-In</H1>
          </MainHeader>
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
                {flowState.voter.firstName} {flowState.voter.middleName}{' '}
                {flowState.voter.lastName} is checked in
              </H1>
              <p>Give the voter their receipt.</p>
            </FullScreenMessage>
          </Column>
          <ButtonBar>
            <Button icon="X" onPress={() => setFlowState({ step: 'search' })}>
              Close
            </Button>
          </ButtonBar>
        </NoNavScreen>
      );

    default:
      throwIllegalValue(flowState);
  }
}

type RegistrationFlowState =
  | { step: 'register' }
  | { step: 'printing'; registrationData: VoterRegistration }
  | { step: 'success'; voter: Voter };

function VoterRegistrationScreen(): JSX.Element {
  const registerVoterMutation = registerVoter.useMutation();
  const [flowState, setFlowState] = useState<RegistrationFlowState>({
    step: 'register',
  });

  switch (flowState.step) {
    case 'register':
      return (
        <AddVoterScreen
          onSubmit={(registrationData: VoterRegistration) => {
            setFlowState({ step: 'printing', registrationData });
            registerVoterMutation.mutate(
              { registrationData },
              {
                onSuccess: (voter) => {
                  setFlowState({ step: 'success', voter });
                },
              }
            );
          }}
        />
      );

    case 'printing':
      return (
        <NoNavScreen>
          <MainHeader>
            <H1>Register Voter</H1>
          </MainHeader>
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
          <MainHeader>
            <H1>Voter Registered</H1>
          </MainHeader>
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
                {flowState.voter.firstName} {flowState.voter.middleName}{' '}
                {flowState.voter.lastName} is registered
              </H1>
              <p>Give the voter their receipt.</p>
            </FullScreenMessage>
          </Column>
          <ButtonBar>
            <Button icon="X" onPress={() => setFlowState({ step: 'register' })}>
              Close
            </Button>
          </ButtonBar>
        </NoNavScreen>
      );

    default:
      throwIllegalValue(flowState);
  }
}

export function PollWorkerScreen(): JSX.Element | null {
  const getDeviceStatusesQuery = getDeviceStatuses.useQuery();

  if (!getDeviceStatusesQuery.isSuccess) {
    return null;
  }

  const { printer } = getDeviceStatusesQuery.data;
  if (!printer.connected) {
    return (
      <PollWorkerNavScreen>
        <Column style={{ justifyContent: 'center', flex: 1 }}>
          <FullScreenMessage
            image={
              <FullScreenIconWrapper>
                <Icons.Danger />
              </FullScreenIconWrapper>
            }
            title="No Printer Detected"
          >
            <p>Connect printer to continue.</p>
          </FullScreenMessage>
        </Column>
      </PollWorkerNavScreen>
    );
  }

  return (
    <Switch>
      <Route
        path={pollWorkerRoutes.checkIn.path}
        component={VoterCheckInScreen}
      />
      <Route
        path={pollWorkerRoutes.addVoter.path}
        component={VoterRegistrationScreen}
      />
      <Redirect to={pollWorkerRoutes.checkIn.path} />
    </Switch>
  );
}
