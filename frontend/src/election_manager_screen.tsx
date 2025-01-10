import {
  Button,
  Card,
  H1,
  H2,
  MainContent,
  MainHeader,
  P,
} from '@votingworks/ui';
import { assert } from '@votingworks/basics';
import { format } from '@votingworks/utils';
import { Header, NavScreen } from './nav_screen';
import { getElectionConfiguration, logOut } from './api';

export function ElectionManagerScreen(): JSX.Element {
  const getElectionConfigurationQuery = getElectionConfiguration.useQuery();
  assert(getElectionConfigurationQuery.isSuccess);
  const electionConfiguration =
    getElectionConfigurationQuery.data.unsafeUnwrap();

  const logOutMutation = logOut.useMutation();

  return (
    <NavScreen>
      <Header>
        <H1>Election Manager Settings</H1>
        <Button icon="Lock" onPress={() => logOutMutation.mutate()}>
          Lock Machine
        </Button>
      </Header>
      <MainContent>
        <Card color="neutral">
          <H2>{electionConfiguration.electionName}</H2>
          <P>
            {format.localeLongDate(
              electionConfiguration.electionDate.toMidnightDatetimeWithSystemTimezone()
            )}
            <br />
            {electionConfiguration.precinctName}
          </P>
        </Card>
      </MainContent>
    </NavScreen>
  );
}
