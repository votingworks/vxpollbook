import { assert } from '@votingworks/basics';
import {
  FullScreenIconWrapper,
  FullScreenMessage,
  Icons,
  Main,
  Screen,
  UsbDriveImage,
} from '@votingworks/ui';
import { getElection } from './api';

export function UnconfiguredScreen(): JSX.Element {
  const getElectionQuery = getElection.useQuery({
    refetchInterval: 100,
  });
  assert(getElectionQuery.isSuccess);
  const electionResult = getElectionQuery.data;

  if (electionResult.isOk() || electionResult.err() === 'loading') {
    return (
      <Screen>
        <Main centerChild>
          <FullScreenMessage
            title="Configuring VxPollbook from USB drive…"
            image={
              <FullScreenIconWrapper>
                <Icons.Loading />
              </FullScreenIconWrapper>
            }
          />
        </Main>
      </Screen>
    );
  }

  if (electionResult.err() === 'not-found') {
    return (
      <Screen>
        <Main centerChild>
          <FullScreenMessage
            title="Failed to configure VxPollbook"
            image={
              <FullScreenIconWrapper>
                <Icons.Warning color="warning" />
              </FullScreenIconWrapper>
            }
          >
            No pollbook package found on the inserted USB drive.
          </FullScreenMessage>
        </Main>
      </Screen>
    );
  }

  return (
    <Screen>
      <Main centerChild>
        <FullScreenMessage
          title="Insert a USB drive containing a pollbook package"
          image={<UsbDriveImage />}
        />
      </Main>
    </Screen>
  );
}
