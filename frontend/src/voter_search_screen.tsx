import {
  MainHeader,
  H1,
  MainContent,
  Callout,
  H2,
  Font,
  Button,
  Table,
  Screen,
  Main,
  Card,
} from '@votingworks/ui';
import debounce from 'lodash.debounce';
import { useState, useMemo } from 'react';
import { Column, Form, Row, InputGroup } from './layout';
import { Voter } from './types';
import { VoterConfirmScreen } from './voter_confirm_screen';
import votersJson from './voters.json';
import styled from 'styled-components';
import { NoNavScreen } from './nav_screen';

const voters: Voter[] = votersJson as any;

const VoterTableWrapper = styled(Card)`
  overflow: hidden;
  > div {
    overflow-y: auto;
    padding: 0;
  }
`;

const VoterTable = styled(Table)`
  td {
    padding: 1rem 1rem;
  }

  tr:nth-child(odd) {
    background-color: ${(p) => p.theme.colors.container};
  }
  tr:last-child {
    td {
      border-bottom: none;
    }
  }
`;

interface Search {
  lastName: string;
  firstName: string;
}

export function VoterSearchScreen({
  onSelect,
}: {
  onSelect: (voter: Voter) => void;
}): JSX.Element {
  const [search, setSearch] = useState<Search>({
    lastName: '',
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
  const NUM_VOTERS_TO_SHOW = 20;

  return (
    <NoNavScreen>
      <Main flexColumn>
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
                  <VoterTableWrapper>
                    <VoterTable>
                      <tbody>
                        {filteredVoters.map((voter) => (
                          <tr key={voter.voterID}>
                            <td>
                              <H2 style={{ margin: 0 }}>
                                {voter.lastName}, {voter.firstName}
                              </H2>
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
                                onPress={() => onSelect(voter)}
                              >
                                <Font noWrap>Start Check-In</Font>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </VoterTable>
                  </VoterTableWrapper>
                </>
              ))}
          </Column>
        </MainContent>
      </Main>
    </NoNavScreen>
  );
}
