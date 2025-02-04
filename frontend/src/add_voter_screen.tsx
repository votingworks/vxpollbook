/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Button,
  ButtonBar,
  Callout,
  Card,
  Font,
  H1,
  H2,
  LabelledText,
  MainContent,
  MainHeader,
  SearchSelect,
  Select,
} from '@votingworks/ui';
import { useState } from 'react';
import type { VoterRegistration } from '@votingworks/pollbook-backend';
import styled from 'styled-components';
import {
  assert,
  DateWithoutTime,
  integers,
  throwIllegalValue,
} from '@votingworks/basics';
import { getDaysInMonth, MONTHS_LONG } from '@votingworks/utils';
import { safeParseInt, SelectChangeEventFunction } from '@votingworks/types';
import { Column, Row, InputGroup, FieldName } from './layout';
import { NoNavScreen } from './nav_screen';

const TextField = styled.input`
  width: 100%;
`;

const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear() - 18;
type TimePart = 'year' | 'month' | 'day';

export function DatePicker({
  label,
  onChange,
}: {
  label: string;
  onChange: (date: string) => void;
}): JSX.Element {
  const [year, setYear] = useState<number | undefined>();
  const [month, setMonth] = useState<number | undefined>();
  const [day, setDay] = useState<number | undefined>();

  function onUpdateTime(part: TimePart, value?: string): void {
    const numberValue = safeParseInt(value).ok();
    switch (part) {
      case 'year':
        setYear(numberValue);
        break;
      case 'month':
        setMonth(numberValue);
        break;
      case 'day':
        setDay(numberValue);
        break;
      default:
        throwIllegalValue(part);
    }
    onChange(`${year}-${month}-${day}`);
  }

  return (
    <InputGroup label="Date of Birth">
      <Row style={{ gap: '1rem' }}>
        <Column style={{ flex: 1 }}>
          <label htmlFor="year">Year</label>
          <SearchSelect
            id="year"
            value={year?.toString()}
            onChange={(value) => onUpdateTime('year', value)}
            options={[...integers({ from: MIN_YEAR, through: MAX_YEAR })].map(
              (yearOpt) => ({
                value: yearOpt.toString(),
                label: yearOpt.toString(),
              })
            )}
          />
        </Column>
        <Column style={{ flex: 1 }}>
          <label htmlFor="month">Month</label>
          <SearchSelect
            value={month?.toString()}
            id="month"
            onChange={(value) => onUpdateTime('month', value)}
            disabled={!year}
            options={MONTHS_LONG.map((monthOpt, index) => ({
              label: monthOpt,
              value: (index + 1).toString(),
            }))}
          />
        </Column>
        <Column style={{ flex: 1 }}>
          <label htmlFor="day">Day</label>
          <SearchSelect
            value={day?.toString()}
            id="day"
            onChange={(value) => onUpdateTime('day', value)}
            disabled={!year || !month}
            options={
              year && month
                ? getDaysInMonth(year, month).map(({ day: dayOpt }) => ({
                    value: dayOpt.toString(),
                    label: dayOpt.toString(),
                  }))
                : []
            }
          />
        </Column>
      </Row>
    </InputGroup>
  );
}

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
    dateOfBirth: '',
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
    state: '',
  });

  function handleSubmit() {
    // Function to be implemented later to call the correct backend mutation endpoint
    // For now, just call onSuccess with the voter data
    onSubmit(voter);
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
          <InputGroup label="First Name">
            <TextField
              value={voter.firstName}
              onChange={(e) =>
                setVoter({ ...voter, firstName: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="Last Name">
            <TextField
              value={voter.lastName}
              onChange={(e) => setVoter({ ...voter, lastName: e.target.value })}
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
          <InputGroup label="Suffix">
            <TextField
              value={voter.suffix}
              onChange={(e) => setVoter({ ...voter, suffix: e.target.value })}
            />
          </InputGroup>
        </Row>

        <Row
          style={{ gap: '1rem', flexGrow: 1, justifyContent: 'space-between' }}
        >
          <Column style={{ flex: 1 }}>
            <DatePicker
              label="Date of Birth"
              onChange={(date) => setVoter({ ...voter, dateOfBirth: date })}
            />
          </Column>
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
          <InputGroup label="Street Number">
            <TextField
              value={voter.streetNumber}
              onChange={(e) =>
                setVoter({ ...voter, streetNumber: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="Street Name">
            <TextField
              value={voter.streetName}
              onChange={(e) =>
                setVoter({ ...voter, streetName: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="Street Suffix" style={{ flex: 0 }}>
            <TextField
              value={voter.streetSuffix}
              style={{ width: '6rem' }}
              onChange={(e) =>
                setVoter({ ...voter, streetSuffix: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="House Fraction Number">
            <TextField
              value={voter.houseFractionNumber}
              onChange={(e) =>
                setVoter({ ...voter, houseFractionNumber: e.target.value })
              }
            />
          </InputGroup>
          <InputGroup label="Apartment/Unit Number">
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
          <InputGroup label="City">
            <TextField
              value={voter.city}
              onChange={(e) => setVoter({ ...voter, city: e.target.value })}
            />
          </InputGroup>
          <InputGroup label="State">
            <TextField
              value={voter.state}
              onChange={(e) => setVoter({ ...voter, state: e.target.value })}
            />
          </InputGroup>
          <InputGroup label="Zip Code">
            <TextField
              value={voter.zipCode}
              onChange={(e) => setVoter({ ...voter, zipCode: e.target.value })}
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
