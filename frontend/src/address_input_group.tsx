import type {
  ValidStreetInfo,
  Voter,
  VoterAddressChangeRequest,
  VoterRegistrationRequest,
} from '@votingworks/pollbook-backend';
import { SearchSelect } from '@votingworks/ui';
import React, { useMemo } from 'react';
import { safeParseInt } from '@votingworks/types';
import { Row, FieldName } from './layout';
import {
  RequiredStaticInput,
  TextField,
  RequiredExpandableInput,
  StaticInput,
  ExpandableInput,
} from './shared_components';
import { getValidStreetInfo } from './api';

export type VoterAddress = Pick<
  Voter,
  | 'streetNumber'
  | 'streetName'
  | 'apartmentUnitNumber'
  | 'addressLine2'
  | 'postalCityTown'
  | 'postalZip5'
  | 'zip4'
>;

export function voterRegistrationRequestToAddressChangeRequest(
  voter: VoterRegistrationRequest
): VoterAddressChangeRequest {
  return {
    streetNumber: voter.streetNumber,
    streetName: voter.streetName,
    houseFractionNumber: voter.houseFractionNumber,
    streetSuffix: voter.streetSuffix,
    apartmentUnitNumber: voter.apartmentUnitNumber,
    addressLine2: voter.addressLine2,
    addressLine3: voter.addressLine3,
    city: voter.city,
    state: voter.state,
    zipCode: voter.zipCode,
  };
}

export function voterToAddressChangeRequest(
  voter: Voter
): VoterAddressChangeRequest {
  return {
    streetNumber: voter.streetNumber,
    streetName: voter.streetName,
    houseFractionNumber: voter.houseFractionNumber,
    streetSuffix: voter.addressSuffix,
    apartmentUnitNumber: voter.apartmentUnitNumber,
    addressLine2: voter.addressLine2,
    addressLine3: voter.addressLine3,
    city: voter.postalCityTown,
    state: voter.state,
    zipCode: voter.postalZip5 + (voter.zip4 ? `-${voter.zip4}` : ''),
  };
}

function findCityAndZipCodeFromStreetAddress(
  validStreetInfo: ValidStreetInfo[],
  address: VoterAddressChangeRequest
): { city: string; zipCode: string } {
  const streetInfosForStreetName = validStreetInfo.filter(
    (info) => info.streetName === address.streetName
  );
  const streetNumberNumericPart = address.streetNumber.replace(/[^0-9]/g, '');
  const voterStreetNum = safeParseInt(streetNumberNumericPart).ok();
  const streetInfo =
    voterStreetNum !== undefined
      ? streetInfosForStreetName.find(
          (info) =>
            voterStreetNum >= info.lowRange &&
            voterStreetNum <= info.highRange &&
            (info.side === 'all' || (voterStreetNum - info.lowRange) % 2 === 0)
        )
      : undefined;

  // Populate city and zipCode from the first matching street info
  return {
    city: streetInfo?.postalCity || '',
    zipCode: streetInfo?.zip5.padStart(5, '0') || '',
  };
}

export function AddressInputGroup({
  address,
  onChange,
}: {
  address: VoterAddressChangeRequest;
  onChange: (address: VoterAddressChangeRequest) => void;
}): JSX.Element {
  const validStreetInfoQuery = getValidStreetInfo.useQuery();

  const dedupedStreetNames = useMemo(
    () =>
      validStreetInfoQuery.data
        ? Array.from(
            new Set(validStreetInfoQuery.data.map((info) => info.streetName))
          )
        : [],
    [validStreetInfoQuery.data]
  );

  function handleChange(newAddress: VoterAddressChangeRequest) {
    const { city, zipCode } = findCityAndZipCodeFromStreetAddress(
      validStreetInfoQuery.data || [],
      newAddress
    );
    onChange({
      ...newAddress,
      city,
      zipCode,
    });
  }

  return (
    <React.Fragment>
      <Row style={{ gap: '1rem' }}>
        <RequiredStaticInput>
          <FieldName>Street #</FieldName>
          <TextField
            id="streetNumber"
            value={address.streetNumber}
            style={{ width: '8rem' }}
            onChange={(e) =>
              handleChange({ ...address, streetNumber: e.target.value })
            }
          />
        </RequiredStaticInput>
        <RequiredExpandableInput>
          <FieldName>Street Name</FieldName>
          <SearchSelect
            id="streetName"
            value={address.streetName || undefined}
            style={{ flex: 1 }}
            onChange={(value) =>
              handleChange({ ...address, streetName: value || '' })
            }
            options={dedupedStreetNames.map((name) => ({
              value: name,
              label: name,
            }))}
          />
        </RequiredExpandableInput>
        <StaticInput>
          <FieldName>Apartment/Unit #</FieldName>
          <TextField
            value={address.apartmentUnitNumber}
            style={{ width: '8rem' }}
            onChange={(e) =>
              handleChange({ ...address, apartmentUnitNumber: e.target.value })
            }
          />
        </StaticInput>
      </Row>
      <Row style={{ gap: '1rem' }}>
        <ExpandableInput>
          <FieldName>Address Line 2</FieldName>
          <TextField
            value={address.addressLine2}
            onChange={(e) =>
              handleChange({ ...address, addressLine2: e.target.value })
            }
          />
        </ExpandableInput>
        <RequiredExpandableInput>
          <FieldName>City</FieldName>
          <TextField value={address.city} disabled />
        </RequiredExpandableInput>
        <RequiredExpandableInput>
          <FieldName>Zip Code</FieldName>
          <TextField value={address.zipCode} disabled />
        </RequiredExpandableInput>
      </Row>
    </React.Fragment>
  );
}
