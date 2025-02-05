import {
  Button,
  ButtonBar,
  H1,
  MainContent,
  MainHeader,
  SearchSelect,
} from '@votingworks/ui';
import { useState } from 'react';
import type {
  ValidStreetInfo,
  VoterRegistration,
} from '@votingworks/pollbook-backend';
import styled from 'styled-components';
import { safeParseInt } from '@votingworks/types';
import { Column, Row, InputGroup, FieldName } from './layout';
import { NoNavScreen } from './nav_screen';
import { getValidStreetInfo } from './api';

const TextField = styled.input`
  width: 100%;
`;

export function AddVoterScreen({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (registration: VoterRegistration) => void;
}): JSX.Element {
  const [voter, setVoter] = useState<VoterRegistration>({
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
    zipCode: '',
  });

  const validStreetInfoQuery = getValidStreetInfo.useQuery();

  // Compute deduplicated street names
  const dedupedStreetNames = validStreetInfoQuery.data
    ? Array.from(
        new Set(validStreetInfoQuery.data.map((info) => info.streetName))
      )
    : [];

  // Compute valid street info for the selected street name
  const selectedStreetInfos = validStreetInfoQuery.data
    ? validStreetInfoQuery.data.filter(
        (info) => info.streetName === voter.streetName
      )
    : [];

  // Generate valid street number options (assumes each row has properties: start and end)
  const streetNumberOptions = (() => {
    const numbers = new Set<number>();
    selectedStreetInfos.forEach((info) => {
      // For both sides, assume the range step is 2
      const step = info.side === 'all' ? 1 : 2;
      for (let n = info.lowRange; n <= info.highRange; n += step) {
        numbers.add(n);
      }
    });
    return Array.from(numbers)
      .sort((a, b) => a - b)
      .map((n) => n.toString());
  })();

  function isNumberInRange(numString: string, info: ValidStreetInfo) {
    const num = safeParseInt(numString).ok();
    if (!num) {
      return false;
    }
    const validNumbers = new Set<number>();
    const step = info.side === 'all' ? 1 : 2;
    for (let n = info.lowRange; n <= info.highRange; n += step) {
      validNumbers.add(n);
    }
    return validNumbers.has(num);
  }

  const selectedStreetInfo = voter.streetNumber
    ? selectedStreetInfos.filter((info) =>
        isNumberInRange(voter.streetNumber, info)
      )[0]
    : undefined;

  // Populate city and zipCode from the first matching street info
  const cityValue = selectedStreetInfo?.postalCity || '';
  const zipCodeValue = selectedStreetInfo?.zip5.padStart(5, '0') || '';

  function handleSubmit() {
    // Function to be implemented later to call the correct backend mutation endpoint
    // For now, just call onSuccess with the voter data
    onSubmit({
      ...voter,
      city: cityValue,
      zipCode: zipCodeValue,
    });
  }

  return (
    <NoNavScreen>
      <MainHeader>
        <H1>Add New Voter</H1>
      </MainHeader>
      <MainContent
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Row style={{ gap: '1rem', flexGrow: 1 }}>
          <InputGroup label="Last Name">
            <TextField
              value={voter.lastName}
              onChange={(e) => setVoter({ ...voter, lastName: e.target.value })}
            />
          </InputGroup>
          <InputGroup label="First Name">
            <TextField
              value={voter.firstName}
              onChange={(e) =>
                setVoter({ ...voter, firstName: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="Middle Name">
            <TextField
              value={voter.middleName}
              onChange={(e) =>
                setVoter({ ...voter, middleName: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="Suffix" style={{ flex: 0 }}>
            <TextField
              value={voter.suffix}
              style={{ width: '5rem' }}
              onChange={(e) => setVoter({ ...voter, suffix: e.target.value })}
            />
          </InputGroup>

          <Column style={{ flex: 1 }}>
            <label htmlFor="party">
              <FieldName>Party Affiliation</FieldName>
            </label>
            <SearchSelect
              id="party"
              style={{ flex: 1 }}
              value={voter.party}
              onChange={(value) => setVoter({ ...voter, party: value || '' })}
              options={[
                { value: 'REP', label: 'Republican' },
                { value: 'DEM', label: 'Democrat' },
                { value: 'UND', label: 'Undecided' },
              ]}
            />
          </Column>
        </Row>
        <Row style={{ gap: '1rem', flexGrow: 1 }}>
          <Column style={{ flex: 1 }}>
            <label htmlFor="party">
              <FieldName>Street Name</FieldName>
            </label>
            <SearchSelect
              id="streetName"
              value={voter.streetName}
              style={{ flex: 1 }}
              onChange={(value) =>
                setVoter({
                  ...voter,
                  streetName: value || '',
                  streetNumber: '', // reset street number on change
                })
              }
              options={dedupedStreetNames.map((name) => ({
                value: name,
                label: name,
              }))}
            />
          </Column>
          <Column style={{ flex: 0 }}>
            <label htmlFor="party">
              <FieldName>Street #</FieldName>
            </label>
            <SearchSelect
              id="streetNumber"
              value={voter.streetNumber}
              style={{ width: '5rem' }}
              onChange={(value) =>
                setVoter({ ...voter, streetNumber: value || '' })
              }
              options={streetNumberOptions.map((num) => ({
                value: num,
                label: num,
              }))}
            />
          </Column>
          <InputGroup label="City">
            <TextField value={cityValue} disabled />
          </InputGroup>
          <InputGroup label="Zip Code">
            <TextField value={zipCodeValue} disabled />
          </InputGroup>
        </Row>
        <Row style={{ gap: '1rem', flexGrow: 1 }}>
          <InputGroup label="Street Suffix">
            <TextField
              value={voter.streetSuffix}
              onChange={(e) =>
                setVoter({ ...voter, streetSuffix: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="House Fraction #">
            <TextField
              value={voter.houseFractionNumber}
              onChange={(e) =>
                setVoter({ ...voter, houseFractionNumber: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="Apartment/Unit #">
            <TextField
              value={voter.apartmentUnitNumber}
              onChange={(e) =>
                setVoter({ ...voter, apartmentUnitNumber: e.target.value })
              }
            />
          </InputGroup>
        </Row>
        <Row style={{ gap: '1rem', flexGrow: 1 }}>
          <InputGroup label="Address Line 2">
            <TextField
              value={voter.addressLine2}
              onChange={(e) =>
                setVoter({ ...voter, addressLine2: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="Address Line 3">
            <TextField
              value={voter.addressLine3}
              onChange={(e) =>
                setVoter({ ...voter, addressLine3: e.target.value })
              }
            />
          </InputGroup>
        </Row>
      </MainContent>
      <ButtonBar>
        <Button
          rightIcon="Next"
          variant="primary"
          onPress={handleSubmit}
          style={{ flex: 1 }}
        >
          Submit
        </Button>
        <Button onPress={onCancel} style={{ flex: 1 }}>
          Cancel
        </Button>
      </ButtonBar>
    </NoNavScreen>
  );
}
