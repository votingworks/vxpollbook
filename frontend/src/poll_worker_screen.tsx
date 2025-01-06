import {
  Button,
  Callout,
  Font,
  H1,
  H2,
  H3,
  MainContent,
  MainHeader,
  Table,
} from '@votingworks/ui';
import { NavScreen } from './nav_screen';
import { Column, Form, InputGroup, Row } from './layout';
import votersJson from './voters.json';
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import debounce from 'lodash.debounce';

interface Voter {
  voterID: string;
  lastName: string;
  suffix: string;
  firstName: string;
  middleName: string;
  streetNumber: string;
  addressSuffix: string;
  houseFractionNumber: string;
  streetName: string;
  apartmentUnitNumber: string;
  addressLine2: string;
  addressLine3: string;
  postalCityTown: string;
  state: string;
  postalZip5: string;
  zip4: string;
  mailingStreetNumber: string;
  mailingSuffix: string;
  mailingHouseFractionNumber: string;
  mailingStreetName: string;
  mailingApartmentUnitNumber: string;
  mailingAddressLine2: string;
  mailingAddressLine3: string;
  mailingCityTown: string;
  mailingState: string;
  mailingZip5: string;
  mailingZip4: string;
  party: string;
  district: string;
}

const voters: Voter[] = votersJson as any;

const VoterTable = styled(Table).attrs({ borderTop: true })`
  td {
    padding: 1rem 0.5rem;
  }

  tr:nth-child(odd) {
    background-color: ${(p) => p.theme.colors.container};
  }
`;

interface Search {
  lastName: string;
  firstName: string;
}

export function PollWorkerScreen(): JSX.Element {
  const [search, setSearch] = useState<Search>({
    lastName: 'AVE',
    firstName: '',
  });
  const [filter, setFilter] = useState<Search>(search);
  const updateFilter = useMemo(() => debounce(setFilter, 500), []);

  function updateSearch(newSearch: Partial<Search>) {
    setSearch({ ...search, ...newSearch });
    updateFilter({ ...search, ...newSearch });
  }

  const filteredVoters = voters.filter((voter) => {
    return (
      voter.lastName.toUpperCase().startsWith(filter.lastName) &&
      voter.firstName.toUpperCase().startsWith(filter.firstName)
    );
  });
  const NUM_VOTERS_TO_SHOW = 50;

  return (
    <NavScreen>
      <MainHeader>
        <H1>Search Voters</H1>
      </MainHeader>
      <MainContent>
        <Column style={{ gap: '1rem', height: '100%', overflowY: 'hidden' }}>
          <Form>
            <Row style={{ gap: '1rem' }}>
              <InputGroup label="Last Name">
                <input
                  value={search.lastName}
                  onChange={(e) =>
                    updateSearch({
                      lastName: e.target.value.toUpperCase(),
                    })
                  }
                  style={{ flex: 1 }}
                  type="text"
                />
              </InputGroup>
              <InputGroup label="First Name">
                <input
                  value={search.firstName}
                  onChange={(e) =>
                    updateSearch({
                      firstName: e.target.value.toUpperCase(),
                    })
                  }
                  type="text"
                />
              </InputGroup>
            </Row>
          </Form>
          {(search.lastName || search.firstName) &&
            (filteredVoters.length === 0 ? (
              <Callout icon="Info" color="neutral">
                No voters matched.
              </Callout>
            ) : filteredVoters.length > NUM_VOTERS_TO_SHOW ? (
              <Callout icon="Info" color="neutral">
                <div>
                  Voters matched: {filteredVoters.length}. Refine your search
                  further to view results.
                </div>
              </Callout>
            ) : (
              <>
                <div>Voters matched: {filteredVoters.length}</div>
                <div style={{ overflowY: 'auto' }}>
                  <VoterTable>
                    <tbody>
                      {filteredVoters.map((voter) => (
                        <tr key={voter.voterID}>
                          <td>
                            <H3 style={{ margin: 0 }}>
                              {voter.lastName}, {voter.firstName}
                            </H3>
                            {voter.party}
                          </td>
                          <td>
                            {voter.streetNumber} {voter.streetName}
                            <br />
                            <Font noWrap>
                              {voter.postalCityTown}, {voter.state},{' '}
                              {voter.postalZip5}-{voter.zip4}
                            </Font>
                          </td>
                          <td>
                            <div>{voter.voterID}</div>
                          </td>
                          <td>
                            <Button
                              style={{ flexWrap: 'nowrap' }}
                              rightIcon="Next"
                              color="primary"
                              onPress={() => {}}
                            >
                              <Font noWrap>Start Check-In</Font>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </VoterTable>
                </div>
              </>
            ))}
        </Column>
      </MainContent>
    </NavScreen>
  );
}
