import { format } from '@votingworks/utils';
import { assert } from '@votingworks/basics';
import { Icons } from '@votingworks/ui';
import { StyledReceipt, VoterAddress } from './receipt_helpers';
import { Voter, VoterAddressChange } from './types';

function AddressChange({
  address,
}: {
  address: VoterAddressChange;
}): JSX.Element {
  return (
    <div>
      <div>
        {address.streetNumber}
        {address.streetSuffix} {address.streetName}{' '}
        {address.apartmentUnitNumber}
      </div>
      {address.addressLine2 === '' ? null : <div>{address.addressLine2}</div>}
      <div>
        {address.city}, NH {address.zipCode}
      </div>
    </div>
  );
}

export function AddressChangeReceipt({
  voter,
  machineId,
}: {
  voter: Voter;
  machineId: string;
}): JSX.Element {
  const { addressChange } = voter;
  assert(addressChange);

  return (
    <StyledReceipt>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div>
            <strong>Voter Address Updated</strong>
          </div>
          <div>
            {format.localeNumericDateAndTime(new Date(addressChange.timestamp))}
          </div>
          <div>Pollbook: {machineId}</div>
        </div>

        <Icons.Edit style={{ fontSize: '3rem' }} />
      </div>
      <br />
      <div>
        <strong>Voter</strong>
        <div>
          {voter.firstName} {voter.middleName} {voter.lastName} {voter.suffix}
        </div>
        <div>{voter.voterId}</div>
      </div>
      <br />
      <div>
        <strong>Previous Address</strong>
        <VoterAddress voter={voter} />
      </div>
      <br />
      <div>
        <strong>Updated Address</strong>
        <AddressChange address={addressChange} />
      </div>
    </StyledReceipt>
  );
}
