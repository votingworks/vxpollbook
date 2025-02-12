import { throwIllegalValue } from '@votingworks/basics';
import type {
  Voter,
  VoterAddressChangeRequest,
} from '@votingworks/pollbook-backend';
import {
  MainHeader,
  H1,
  FullScreenMessage,
  FullScreenIconWrapper,
  Icons,
  ButtonBar,
  Button,
  MainContent,
} from '@votingworks/ui';
import { useState } from 'react';
import { Column, Row } from './layout';
import { NoNavScreen } from './nav_screen';
import { VoterName } from './shared_components';
import {
  AddressInputGroup,
  voterToAddressChangeRequest,
} from './address_input_group';
import { changeVoterAddress } from './api';

type UpdateAddressFlowState =
  | { step: 'update' }
  | { step: 'printing' }
  | { step: 'success' };

function UpdateAddressScreen({
  voter,
  onConfirm,
  onCancel,
}: {
  voter: Voter;
  onConfirm: (address: VoterAddressChangeRequest) => void;
  onCancel: () => void;
}): JSX.Element {
  const [address, setAddress] = useState<VoterAddressChangeRequest>(
    voterToAddressChangeRequest(voter)
  );
  return (
    <NoNavScreen>
      <MainHeader>
        <H1>Update Voter Address</H1>
      </MainHeader>
      <MainContent>
        <Column style={{ gap: '1rem' }}>
          <AddressInputGroup address={address} onChange={setAddress} />
        </Column>
      </MainContent>
      <ButtonBar>
        <Button
          rightIcon="Next"
          variant="primary"
          // TODO
          // disabled={
          onPress={() => onConfirm(address)}
          style={{ flex: 1 }}
        >
          Confirm Address Update
        </Button>
        <Button onPress={onCancel} style={{ flex: 1 }}>
          Cancel
        </Button>
      </ButtonBar>
    </NoNavScreen>
  );
}

interface UpdateAddressFlowProps {
  voter: Voter;
  returnToCheckIn: () => void;
  exitToSearch: () => void;
}

export function UpdateAddressFlow({
  voter,
  returnToCheckIn,
  exitToSearch,
}: UpdateAddressFlowProps): JSX.Element {
  const [flowState, setFlowState] = useState<UpdateAddressFlowState>({
    step: 'update',
  });
  const changeVoterAddressMutation = changeVoterAddress.useMutation();

  switch (flowState.step) {
    case 'update':
      return (
        <UpdateAddressScreen
          voter={voter}
          onConfirm={(addressChangeData) => {
            setFlowState({ step: 'printing' });
            changeVoterAddressMutation.mutate(
              {
                voterId: voter.voterId,
                addressChangeData,
              },
              { onSuccess: () => setFlowState({ step: 'success' }) }
            );
          }}
          onCancel={returnToCheckIn}
        />
      );

    case 'printing':
      return (
        <NoNavScreen>
          <MainHeader>
            <H1>Update Voter Address</H1>
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
            <Row style={{ justifyContent: 'space-between' }}>
              <H1>Voter Address Updated</H1>
            </Row>
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
                Address updated for <VoterName voter={voter} />
              </H1>
              <p>Give the voter their receipt.</p>
            </FullScreenMessage>
          </Column>
          <ButtonBar>
            <Button
              style={{ flex: 1 }}
              icon="Next"
              variant="primary"
              onPress={returnToCheckIn}
            >
              Continue Check-In
            </Button>
            <Button style={{ flex: 1 }} icon="X" onPress={exitToSearch}>
              Close
            </Button>
          </ButtonBar>
        </NoNavScreen>
      );

    default: {
      throwIllegalValue(flowState);
    }
  }
}
