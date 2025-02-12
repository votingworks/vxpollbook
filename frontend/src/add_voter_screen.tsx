import {
  Button,
  ButtonBar,
  Callout,
  H1,
  MainContent,
  MainHeader,
  SearchSelect,
} from '@votingworks/ui';
import { useMemo, useState } from 'react';
import type { VoterRegistrationRequest } from '@votingworks/pollbook-backend';
import { Column, Row, FieldName } from './layout';
import { PollWorkerNavScreen } from './nav_screen';
import {
  AddressInputGroup,
  voterRegistrationRequestToAddressChangeRequest,
} from './address_input_group';
import {
  RequiredExpandableInput,
  TextField,
  ExpandableInput,
  StaticInput,
  RequiredStaticInput,
} from './shared_components';

function createBlankVoter(): VoterRegistrationRequest {
  return {
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    party: '',
    streetNumber: '',
    streetName: '',
    streetSuffix: '',
    houseFractionNumber: '',
    apartmentUnitNumber: '',
    addressLine2: '',
    addressLine3: '',
    city: '',
    state: 'NH',
    zipCode: '',
  };
}

export function AddVoterScreen({
  onSubmit,
}: {
  onSubmit: (voter: VoterRegistrationRequest) => void;
}): JSX.Element {
  const [voter, setVoter] = useState<VoterRegistrationRequest>(
    createBlankVoter()
  );

  const isAddressValid = !(voter.city === '' || voter.zipCode === '');

  const isSubmitDisabled = useMemo(
    () =>
      voter.firstName.trim() === '' ||
      voter.lastName.trim() === '' ||
      voter.streetName.trim() === '' ||
      voter.party.trim() === '' ||
      !isAddressValid,
    [voter, isAddressValid]
  );

  function handleSubmit() {
    onSubmit({
      ...voter,
      firstName: voter.firstName.toUpperCase(),
      lastName: voter.lastName.toUpperCase(),
      middleName: voter.middleName.toUpperCase(),
      suffix: voter.suffix.toUpperCase(),
      city: voter.city.toUpperCase(),
      zipCode: voter.zipCode,
      streetNumber: voter.streetNumber.replace(/[^0-9]/g, ''),
      streetSuffix: voter.streetNumber.replace(/[0-9]/g, '').toUpperCase(),
      addressLine2: voter.addressLine2.toUpperCase(),
      apartmentUnitNumber: voter.apartmentUnitNumber.toUpperCase(),
    });
  }

  return (
    <PollWorkerNavScreen>
      <MainHeader>
        <H1>Voter Registration</H1>
      </MainHeader>
      <MainContent>
        <Column style={{ gap: '1rem' }}>
          {/* Row 1: Name Line */}
          <Row style={{ gap: '1rem' }}>
            <RequiredExpandableInput>
              <FieldName>Last Name</FieldName>
              <TextField
                value={voter.lastName}
                onChange={(e) =>
                  setVoter({ ...voter, lastName: e.target.value })
                }
              />
            </RequiredExpandableInput>
            <RequiredExpandableInput>
              <FieldName>First Name</FieldName>
              <TextField
                value={voter.firstName}
                onChange={(e) =>
                  setVoter({ ...voter, firstName: e.target.value })
                }
              />
            </RequiredExpandableInput>
            <ExpandableInput>
              <FieldName>Middle Name</FieldName>
              <TextField
                value={voter.middleName}
                onChange={(e) =>
                  setVoter({ ...voter, middleName: e.target.value })
                }
              />
            </ExpandableInput>
            <StaticInput>
              <FieldName>Suffix</FieldName>
              <TextField
                value={voter.suffix}
                style={{ width: '5rem' }}
                onChange={(e) => setVoter({ ...voter, suffix: e.target.value })}
              />
            </StaticInput>
          </Row>
          <AddressInputGroup
            address={voterRegistrationRequestToAddressChangeRequest(voter)}
            onChange={(address) => setVoter({ ...voter, ...address })}
          />
          <Row style={{ gap: '1rem' }}>
            <RequiredStaticInput>
              <FieldName>Party Affiliation</FieldName>
              <SearchSelect
                id="party"
                style={{ width: '20rem' }}
                value={voter.party || undefined}
                onChange={(value) => setVoter({ ...voter, party: value || '' })}
                options={[
                  { value: 'REP', label: 'Republican' },
                  { value: 'DEM', label: 'Democrat' },
                  { value: 'UND', label: 'Undecided' },
                ]}
              />
            </RequiredStaticInput>
          </Row>
          {voter.streetNumber.trim() !== '' &&
            voter.streetName !== '' &&
            !isAddressValid && (
              <Callout icon="Danger" color="danger">
                Invalid address. Make sure the street number and name match a
                valid address for this jurisdiction.
              </Callout>
            )}
        </Column>
      </MainContent>
      <ButtonBar>
        <Button
          icon="Add"
          variant="primary"
          onPress={handleSubmit}
          style={{ flex: 1 }}
          disabled={isSubmitDisabled}
        >
          Register Voter
        </Button>
        <div />
      </ButtonBar>
    </PollWorkerNavScreen>
  );
}
