import React from 'react';
import {
  AppLogo,
  Icons,
  LeftNav,
  LogoCircleWhiteOnPurple,
  Main,
  MainHeader,
  Screen,
} from '@votingworks/ui';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Row } from './layout';
import { getConnectedPollbooks } from './api';

export const DeviceInfoBar = styled(Row)`
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  width: 100%;
  background: ${(p) => p.theme.colors.inverseContainer};
  color: ${(p) => p.theme.colors.onInverse};
  padding: 0.25rem 1rem;
`;

export const Header = styled(MainHeader)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 0.75rem;
  gap: 0.5rem;
`;

function NetworkStatus() {
  const getConnectedPollbooksQuery = getConnectedPollbooks.useQuery();
  return (
    <span>
      <Icons.Antenna color="inverse" />{' '}
      {getConnectedPollbooksQuery.data
        ? getConnectedPollbooksQuery.data.length
        : '_'}
    </span>
  );
}

function BatteryStatus() {
  return (
    <span>
      <Icons.BatteryFull color="inverse" /> 100%
    </span>
  );
}

function UsbStatus() {
  return (
    <span>
      <Icons.UsbDrive color="inverse" />
    </span>
  );
}

function Statuses() {
  return (
    <Row style={{ gap: '1.5rem' }}>
      <NetworkStatus />
      <UsbStatus />
      <BatteryStatus />
    </Row>
  );
}

export function NavScreen({
  navContent,
  children,
}: {
  navContent?: React.ReactNode;
  children?: React.ReactNode;
}): JSX.Element {
  return (
    <Screen flexDirection="row">
      <LeftNav style={{ width: '14rem' }}>
        <Link to="/">
          <AppLogo appName="VxPollbook" />
        </Link>
        {navContent}
      </LeftNav>
      <Main flexColumn>
        <DeviceInfoBar>
          <div />
          <Statuses />
        </DeviceInfoBar>
        {children}
      </Main>
    </Screen>
  );
}

export function NoNavScreen({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Screen flexDirection="row">
      <Main flexColumn>
        <DeviceInfoBar>
          <Row style={{ alignItems: 'center', gap: '0.5rem' }}>
            <LogoCircleWhiteOnPurple
              style={{ height: '1rem', width: '1rem' }}
            />
            <span style={{ fontWeight: 700 }}>VxPollbook</span>
          </Row>
          <Statuses />
        </DeviceInfoBar>
        {children}
      </Main>
    </Screen>
  );
}

// export function ElectionNavScreen({
//   electionId,
//   children,
// }: {
//   electionId: string;
//   children: React.ReactNode;
// }): JSX.Element {
//   const currentRoute = useRouteMatch();
//   return (
//     <NavScreen
//       navContent={
//         <NavList>
//           {electionNavRoutes(electionId).map(({ title, path }) => (
//             <NavListItem key={path}>
//               <NavLink to={path} isActive={path === currentRoute.url}>
//                 {title}
//               </NavLink>
//             </NavListItem>
//           ))}
//           <NavDivider />
//           <NavListItem>
//             <LinkButton
//               to="/"
//               fill="transparent"
//               color="inverseNeutral"
//               icon="ChevronLeft"
//             >
//               All Elections
//             </LinkButton>
//           </NavListItem>
//         </NavList>
//       }
//     >
//       {children}
//     </NavScreen>
//   );
// }
