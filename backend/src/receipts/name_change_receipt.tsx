import { assert } from '@votingworks/basics';
import { Icons } from '@votingworks/ui';
import { format } from '@votingworks/utils';
import { Voter } from '../types';
import {
  StyledReceipt,
  VoterName,
  PartyName,
  ReceiptNumber,
} from './receipt_helpers';

export function NameChangeReceipt({
  voter,
  receiptNumber,
  machineId,
}: {
  voter: Voter;
  receiptNumber: number;
  machineId: string;
}): JSX.Element {
  const { nameChange } = voter;
  assert(nameChange);

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
            <strong>Voter Name Updated</strong>
          </div>
          <div>
            {format.localeNumericDateAndTime(new Date(nameChange.timestamp))}
          </div>
          <div>Pollbook: {machineId}</div>
        </div>

        <Icons.Edit style={{ fontSize: '3rem' }} />
      </div>
      <br />
      <div>
        <strong>Updated Voter</strong>
        <div>
          <VoterName voter={voter} />
        </div>
        <div>
          <PartyName party={voter.party} />
        </div>
        <div>Voter ID: {voter.voterId}</div>
      </div>
      <br />
      <div>
        <strong>Previous Name</strong>
        <div>
          <VoterName voter={{ ...voter, nameChange: undefined }} />
        </div>
      </div>

      <ReceiptNumber receiptNumber={receiptNumber} />
    </StyledReceipt>
  );
}
