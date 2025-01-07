import { format } from '@votingworks/utils';
import { LabeledValue, ReportMetadata } from '@votingworks/ui';
import styled from 'styled-components';
import { Voter } from './types';

const StyledVoterChecklist = styled.div`
  font-size: 12px;
`;

const VoterTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    border-top: 1px solid black;
    border-bottom: 1px solid black;
    text-align: left;
    vertical-align: top;
  }

  th,
  td {
    padding: 0.5em 0.5em;
  }

  tr:nth-child(even) td {
    background-color: rgb(234, 234, 234);
  }
`;

export function VoterChecklist({ voters }: { voters: Voter[] }): JSX.Element {
  return (
    <StyledVoterChecklist>
      <div>
        <h1>Backup Voter Checklist</h1>
        <h2>Test Election</h2>
        <ReportMetadata>
          <LabeledValue
            label="Exported At"
            value={format.localeLongDateAndTime(new Date())}
          />
        </ReportMetadata>
      </div>
      <VoterTable>
        <thead>
          <tr>
            <th />
            <th>Party</th>
            <th>Voter Name</th>
            <th>CVA</th>
            <th>OOS DL</th>
            <th>Domicile Address</th>
            <th>Mailing Address</th>
            <th>Dist</th>
            <th>Voter ID</th>
            <th>Barcode</th>
          </tr>
        </thead>
        <tbody>
          {voters.map((voter) => (
            <tr key={voter.voterId}>
              <td>☐</td>
              <td>{voter.party}</td>
              <td>
                {voter.lastName}, {voter.suffix} {voter.firstName}{' '}
                {voter.middleName}
              </td>
              <td>
                {voter.checkIn?.identificationMethod.type ===
                'challengedVoterAffidavit'
                  ? '☑'
                  : '☐'}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {voter.checkIn?.identificationMethod.type ===
                'outOfStateDriversLicense' ? (
                  <span>
                    ☑ <u>voter.checkIn.identificationMethod.state</u>
                  </span>
                ) : (
                  '☐ __'
                )}
              </td>
              <td>
                {voter.streetNumber} {voter.addressSuffix}{' '}
                {voter.houseFractionNumber} {voter.streetName}{' '}
                {voter.apartmentUnitNumber}
              </td>
              <td>
                {voter.mailingStreetNumber} {voter.mailingSuffix}{' '}
                {voter.mailingHouseFractionNumber} {voter.mailingStreetName}{' '}
                {voter.mailingApartmentUnitNumber}
              </td>
              <td>{voter.district}</td>
              <td>{voter.voterId}</td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </VoterTable>
    </StyledVoterChecklist>
  );
}
