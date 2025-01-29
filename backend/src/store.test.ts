/* eslint-disable @typescript-eslint/no-unused-vars */
import { assert, DateWithoutTime, sleep } from '@votingworks/basics';
import { ElectionId } from '@votingworks/types';
import { create } from 'domain';
import { Store } from './store';
import { Election, EventType, Voter, VoterCheckInEvent } from './types';
import { HlcTimestamp, HybridLogicalClock } from './hybrid_logical_clock';

const myMachineId = 'machine-1';
const otherMachineId = 'machine-2';

function createVoter(
  voterId: string,
  firstName: string,
  lastName: string
): Voter {
  return {
    voterId,
    firstName,
    lastName,
    middleName: '',
    suffix: '',
    streetNumber: '',
    addressSuffix: '',
    houseFractionNumber: '',
    streetName: '',
    state: '',
    apartmentUnitNumber: '',
    addressLine2: '',
    addressLine3: '',
    postalCityTown: '',
    postalZip5: '',
    zip4: '',
    mailingStreetNumber: '',
    mailingSuffix: '',
    mailingHouseFractionNumber: '',
    mailingStreetName: '',
    mailingApartmentUnitNumber: '',
    mailingAddressLine2: '',
    mailingAddressLine3: '',
    mailingCityTown: '',
    mailingState: '',
    mailingZip5: '',
    mailingZip4: '',
    party: '',
    district: '',
  };
}

function createTestStore(): Store {
  return Store.memoryStore(myMachineId);
}

function createVoterCheckInEvent(
  machineId: string,
  voterId: string,
  hlcTimestamp: HlcTimestamp
): VoterCheckInEvent {
  const timestamp = new Date().toISOString();
  return {
    type: EventType.VoterCheckIn,
    machineId,
    timestamp: hlcTimestamp,
    voterId,
    checkInData: {
      timestamp,
      identificationMethod: {
        type: 'photoId',
        state: 'nh',
      },
      machineId,
    },
  };
}

test('getNewEvents returns events for unknown machines', () => {
  const store = createTestStore();
  const myHlcClock = new HybridLogicalClock(myMachineId);
  const theirHlcClock = new HybridLogicalClock(otherMachineId);
  const event1 = createVoterCheckInEvent(
    myMachineId,
    'voter-1',
    myHlcClock.tick()
  );
  const event2 = createVoterCheckInEvent(
    otherMachineId,
    'voter-2',
    theirHlcClock.tick()
  );

  store.saveEvent(event1);
  store.saveEvent(event2);

  const { events, hasMore } = store.getNewEvents({
    physical: 0,
    logical: 0,
    machineId: 'a-different-machine',
  });

  assert(events.length === 2);
  expect(events).toEqual([event1, event2]);
  expect(hasMore).toEqual(false);
});

test('getNewEvents returns events for known machines with new events', () => {
  const store = createTestStore();
  const myClock = new HybridLogicalClock(myMachineId);
  const theirClock = new HybridLogicalClock(otherMachineId);
  const event1 = createVoterCheckInEvent(
    myMachineId,
    'voter-1',
    myClock.tick()
  );
  const event2 = createVoterCheckInEvent(
    otherMachineId,
    'voter-2',
    theirClock.tick()
  );
  const event3 = createVoterCheckInEvent(
    myMachineId,
    'voter-3',
    myClock.tick()
  );

  store.saveEvent(event1);
  store.saveEvent(event2);
  store.saveEvent(event3);

  const { events, hasMore } = store.getNewEvents(theirClock.now());

  assert(events.length === 1);
  expect(events).toEqual([event3]);
  expect(hasMore).toEqual(false);
});

test('getNewEvents returns no events for known machines and unknown machines', async () => {
  const store = createTestStore();
  const myClock = new HybridLogicalClock(myMachineId);
  const theirClock = new HybridLogicalClock(otherMachineId);
  const event1 = createVoterCheckInEvent(
    myMachineId,
    'voter-1',
    myClock.tick()
  );
  const event2 = createVoterCheckInEvent(
    myMachineId,
    'voter-2',
    myClock.tick()
  );
  const event3 = createVoterCheckInEvent(
    myMachineId,
    'voter-3',
    myClock.tick()
  );
  const lastSyncTime = myClock.now();
  const event4 = createVoterCheckInEvent(
    myMachineId,
    'voter-4',
    myClock.tick()
  );
  const event5 = createVoterCheckInEvent(
    myMachineId,
    'voter-5',
    myClock.tick()
  );
  await sleep(10);
  const event6 = createVoterCheckInEvent(
    otherMachineId,
    'voter-6',
    theirClock.tick()
  );
  const event7 = createVoterCheckInEvent(
    otherMachineId,
    'voter-7',
    theirClock.tick()
  );

  store.saveEvent(event1);
  store.saveEvent(event2);
  store.saveEvent(event3);
  store.saveEvent(event4);
  store.saveEvent(event5);
  store.saveEvent(event6);
  store.saveEvent(event7);

  const { events, hasMore } = store.getNewEvents(lastSyncTime);

  assert(events.length === 4);
  expect(events).toEqual([event4, event5, event6, event7]);
  expect(hasMore).toEqual(false);
});

// Multi-Node test for the following scenario:
// - PollbookA comes online
// - PollbookB comes online
// - PollbookA finds and connects/sync with PollbookB
// - PollbookB finds and connects/sync with PollbookA
// - Bob checks in on PollbookA
// - Charlie checks in on PollbookB
// - PollbookB syncs with PollbookA for latest events
// - PollbookA syncs with PollbookB for latest events
// - PollbookB goes offline
// - While offline Sue checks in on PollbookB
// - While offline the Sue check in is "undone" on PollbookB
// - Several real-world minutes later Sue checks in on PollbookA
// - PollbookB comes back online and resyncs with PollbookA
// - PollbookA refinds and resyncs with PollbookB

// Desired State: PollbookA and B both see Bob, Charlie and Sue as checked in with the check in for Sue coming from PollbookA
test('multi-node synchronization scenario - offline undo', async () => {
  // Set up two pollbook nodes
  const pollbookA = Store.memoryStore('pollbook-a');
  const pollbookB = Store.memoryStore('pollbook-b');

  // Set up test election and voters
  const testElection: Election = {
    id: 'test-election' as ElectionId,
    title: 'Test Election',
    date: new DateWithoutTime('2024-01-01'),
    precincts: [],
  };

  const testVoters = [
    createVoter('bob', 'Bob', 'Smith'),
    createVoter('charlie', 'Charlie', 'Brown'),
    createVoter('sue', 'Sue', 'Jones'),
  ];

  // Initialize both pollbooks with same election data
  pollbookA.setElectionAndVoters(testElection, testVoters);
  pollbookB.setElectionAndVoters(testElection, testVoters);

  // Both pollbooks come online
  pollbookA.setOnlineStatus(true);
  pollbookB.setOnlineStatus(true);

  // Bob checks in on PollbookA
  pollbookA.recordVoterCheckIn({
    voterId: 'bob',
    identificationMethod: { type: 'photoId', state: 'nh' },
  });
  expect(pollbookA.getCheckInCount()).toEqual(1);

  // Charlie checks in on PollbookB
  pollbookB.recordVoterCheckIn({
    voterId: 'charlie',
    identificationMethod: { type: 'photoId', state: 'al' },
  });
  expect(pollbookB.getCheckInCount()).toEqual(1);

  // Pollbook B syncs with Pollbook A
  const startTimeB: HlcTimestamp = {
    physical: 0,
    logical: 0,
    machineId: 'pollbook-b',
  };
  const eventsForB = pollbookA.getNewEvents(startTimeB);
  expect(eventsForB.events.length).toEqual(1);
  expect(eventsForB.hasMore).toEqual(false);
  const lastSyncTimeOnB = pollbookB.saveRemoteEvents(
    eventsForB.events,
    startTimeB
  );

  // Pollbook A syncs with Pollbook B
  const startTimeA: HlcTimestamp = {
    physical: 0,
    logical: 0,
    machineId: 'pollbook-a',
  };
  const eventsForA = pollbookB.getNewEvents(startTimeA);
  expect(eventsForA.events.length).toEqual(2); // Since pollbook B already got events from A it will send us the Bob check in we already have. This is ok and expected.
  expect(eventsForA.hasMore).toEqual(false);
  const lastSyncTimeOnA = pollbookA.saveRemoteEvents(
    eventsForA.events,
    startTimeA
  );

  // Verify both pollbooks see Bob and Charlie checked in
  expect(pollbookA.getCheckInCount()).toEqual(2);
  expect(pollbookB.getCheckInCount()).toEqual(2);

  // PollbookB goes offline
  pollbookB.setOnlineStatus(false);

  // Sue checks in with a CA id and then is undone on PollbookB while offline
  pollbookB.recordVoterCheckIn({
    voterId: 'sue',
    identificationMethod: { type: 'photoId', state: 'ca' },
  });
  pollbookB.recordUndoVoterCheckIn('sue');

  // Wait a bit to ensure physical timestamps will be different
  await sleep(10);

  // Sue checks in on PollbookA
  pollbookA.recordVoterCheckIn({
    voterId: 'sue',
    identificationMethod: { type: 'photoId', state: 'nh' },
  });

  // PollbookB comes back online
  pollbookB.setOnlineStatus(true);

  // Pollbook B syncs with Pollbook A
  const finalEventsForB = pollbookA.getNewEvents(lastSyncTimeOnB);
  pollbookB.saveRemoteEvents(finalEventsForB.events, lastSyncTimeOnB);
  expect(finalEventsForB.events.length).toEqual(2);

  // Pollbook A sync with Pollbook B
  const finalEventsForA = pollbookB.getNewEvents(lastSyncTimeOnA);
  pollbookA.saveRemoteEvents(finalEventsForA.events, lastSyncTimeOnA);
  expect(finalEventsForA.events.length).toEqual(3);

  // Verify final state
  // Both pollbooks should see all three voters checked in
  expect(pollbookA.getCheckInCount()).toEqual(3);
  expect(pollbookB.getCheckInCount()).toEqual(3);

  // Verify Sue's check-in is from PollbookA with NH id.
  const voters = pollbookA.searchVoters({ firstName: 'Sue', lastName: '' });
  expect((voters as Voter[]).length).toEqual(1);
  expect((voters as Voter[])[0].checkIn).toEqual({
    timestamp: expect.any(String),
    identificationMethod: { type: 'photoId', state: 'nh' },
    machineId: 'pollbook-a',
  });
});

// - PollbookA comes online - the system clock is configured wrong for 8:00am
// - PollbookB comes online - the system clock is configured correct for 9:00am
// - Bob checks in on PollbookB
// - PollbookA syncs events from PollbookB
// - The bob check in is "undone" on PollbookA
// - PollbookB syncs events from PollbookA

// Desired scenario: The bob check in is marked as undone even though the system clock of that event will have happened before the original check in
test('multi node scenario - bad system time', () => {
  jest.useFakeTimers();

  // Set up two pollbook nodes
  const pollbookA = Store.memoryStore('pollbook-a');
  const pollbookB = Store.memoryStore('pollbook-b');

  // Set up test election and voters
  const testElection: Election = {
    id: 'test-election' as ElectionId,
    title: 'Test Election',
    date: new DateWithoutTime('2024-01-01'),
    precincts: [],
  };

  const testVoters = [createVoter('bob', 'Bob', 'Smith')];

  // Initialize both pollbooks with same election data
  pollbookA.setElectionAndVoters(testElection, testVoters);
  pollbookB.setElectionAndVoters(testElection, testVoters);

  // Both pollbooks come online
  pollbookA.setOnlineStatus(true);
  pollbookB.setOnlineStatus(true);

  // Set time to 9am for PollbookB's check-in
  const nineAm = new Date('2024-01-01T09:00:00Z').getTime();
  jest.setSystemTime(nineAm);

  // Bob checks in on PollbookB (with correct time)
  pollbookB.recordVoterCheckIn({
    voterId: 'bob',
    identificationMethod: { type: 'photoId', state: 'nh' },
  });
  expect(pollbookB.getCheckInCount()).toEqual(1);

  // PollbookA syncs events from PollbookB
  const startTimeA: HlcTimestamp = {
    physical: 0,
    logical: 0,
    machineId: 'pollbook-a',
  };
  const eventsForA = pollbookB.getNewEvents(startTimeA);
  expect(eventsForA.events.length).toEqual(1);
  const lastSyncTimeOnA = pollbookA.saveRemoteEvents(
    eventsForA.events,
    startTimeA
  );
  expect(pollbookA.getCheckInCount()).toEqual(1);

  // Set time back to 8am for PollbookA's undo operation
  const eightAm = new Date('2024-01-01T08:00:00Z').getTime();
  jest.setSystemTime(eightAm);

  // The bob check in is undone on PollbookA (with wrong time)
  pollbookA.recordUndoVoterCheckIn('bob');
  expect(pollbookA.getCheckInCount()).toEqual(0);

  // PollbookB syncs events from PollbookA
  const eventsForB = pollbookA.getNewEvents(lastSyncTimeOnA);
  expect(eventsForB.events.length).toEqual(1);
  pollbookB.saveRemoteEvents(eventsForB.events, lastSyncTimeOnA);

  // Verify final state - Bob should be marked as NOT checked in on both machines
  // even though the undo event has an earlier timestamp
  expect(pollbookA.getCheckInCount()).toEqual(0);
  expect(pollbookB.getCheckInCount()).toEqual(0);

  // Verify Bob's status specifically
  const votersA = pollbookA.searchVoters({ firstName: 'Bob', lastName: '' });
  const votersB = pollbookB.searchVoters({ firstName: 'Bob', lastName: '' });
  expect((votersA as Voter[])[0].checkIn).toBeUndefined();
  expect((votersB as Voter[])[0].checkIn).toBeUndefined();

  jest.useRealTimers();
});

// Pollbook A and B and C are created. Each checks in a different voter and they all sync events.
// Pollbook C goes offline checks in Carl a few moments later
// Pollbook A and B check in more voters and sync events at a time later then the Carl check in
// Pollbook B is shutdown.
// Pollbook C rejoins the network. Pollbook A and C sync events. A should now have the Carl check in.
// Pollbook C is shutdown.
// Pollbook B rejoins the network. Pollbook A and B sync events. B should now have the Carl check in.

// This test is particularly complex because Pollbook B last synced with Pollbook A AFTER the event occurred on Pollbook C that it now needs from Pollbook A.
function syncEvents(
  fromStore: Store,
  toStore: Store,
  fromTimestamp: HlcTimestamp
): HlcTimestamp {
  const { events } = fromStore.getNewEvents(fromTimestamp);
  return toStore.saveRemoteEvents(events, fromTimestamp);
}

function syncEventsForAllPollbooks(
  pollbooks: Store[],
  lastSyncTimes: Record<string, Record<string, HlcTimestamp>>
): Record<string, Record<string, HlcTimestamp>> {
  const newSyncTimes: Record<
    string,
    Record<string, HlcTimestamp>
  > = lastSyncTimes;
  for (const from of pollbooks) {
    for (const to of pollbooks) {
      if (from !== to) {
        newSyncTimes[from.getMachineId()][to.getMachineId()] = syncEvents(
          from,
          to,
          lastSyncTimes[from.getMachineId()][to.getMachineId()] || {
            physical: 0,
            logical: 0,
            machineId: from.getMachineId(),
          }
        );
      }
    }
  }
  return newSyncTimes;
}

test("multi-node scenario getting a third machine's older events", async () => {
  // Set up three pollbook nodes
  const pollbookA = Store.memoryStore('pollbook-a');
  const pollbookB = Store.memoryStore('pollbook-b');
  const pollbookC = Store.memoryStore('pollbook-c');

  // Set up test election and voters
  const testElection: Election = {
    id: 'test-election' as ElectionId,
    title: 'Test Election',
    date: new DateWithoutTime('2024-01-01'),
    precincts: [],
  };

  const testVoters = [
    createVoter('alice', 'Alice', 'Wonderland'),
    createVoter('bob', 'Bob', 'Builder'),
    createVoter('carl', 'Carl', 'Sagan'),
    createVoter('sue', 'Sue', 'Jones'),
    createVoter('dave', 'Dave', 'Smith'),
    createVoter('eve', 'Eve', 'Johnson'),
  ];

  // Initialize all pollbooks with same election data
  pollbookA.setElectionAndVoters(testElection, testVoters);
  pollbookB.setElectionAndVoters(testElection, testVoters);
  pollbookC.setElectionAndVoters(testElection, testVoters);

  // All pollbooks come online
  pollbookA.setOnlineStatus(true);
  pollbookB.setOnlineStatus(true);
  pollbookC.setOnlineStatus(true);

  // Alice checks in on PollbookA
  pollbookA.recordVoterCheckIn({
    voterId: 'alice',
    identificationMethod: { type: 'photoId', state: 'nh' },
  });
  expect(pollbookA.getCheckInCount()).toEqual(1);

  // Bob checks in on PollbookB
  pollbookB.recordVoterCheckIn({
    voterId: 'bob',
    identificationMethod: { type: 'photoId', state: 'nh' },
  });
  expect(pollbookB.getCheckInCount()).toEqual(1);

  // Carl checks in on PollbookC
  pollbookC.recordVoterCheckIn({
    voterId: 'carl',
    identificationMethod: { type: 'photoId', state: 'nh' },
  });
  expect(pollbookC.getCheckInCount()).toEqual(1);

  let syncTimes: Record<string, Record<string, HlcTimestamp>> = {
    'pollbook-a': {},
    'pollbook-b': {},
    'pollbook-c': {},
  };

  // Sync events between all pollbooks
  syncTimes = syncEventsForAllPollbooks(
    [pollbookA, pollbookB, pollbookC],
    syncTimes
  );

  // Verify all pollbooks see Alice, Bob, and Carl checked in
  expect(pollbookA.getCheckInCount()).toEqual(3);
  expect(pollbookB.getCheckInCount()).toEqual(3);
  expect(pollbookC.getCheckInCount()).toEqual(3);

  // PollbookC goes offline
  pollbookC.setOnlineStatus(false);

  // Wait a bit to ensure physical timestamps will be different
  await sleep(10);

  // Sue checks in on PollbookC while offline
  pollbookC.recordVoterCheckIn({
    voterId: 'sue',
    identificationMethod: { type: 'photoId', state: 'nh' },
  });

  // Wait a bit to ensure physical timestamps will be different
  await sleep(10);

  // PollbookA and PollbookB check in more voters and sync events
  pollbookA.recordVoterCheckIn({
    voterId: 'dave',
    identificationMethod: { type: 'photoId', state: 'nh' },
  });
  pollbookB.recordVoterCheckIn({
    voterId: 'eve',
    identificationMethod: { type: 'photoId', state: 'nh' },
  });

  // Sync events between PollbookA and PollbookB, PollbookC is "offline" and does not sync
  syncTimes = syncEventsForAllPollbooks([pollbookA, pollbookB], syncTimes);
  expect(pollbookA.getCheckInCount()).toEqual(5);
  expect(pollbookB.getCheckInCount()).toEqual(5);
  expect(pollbookC.getCheckInCount()).toEqual(4);

  // PollbookB is shutdown
  pollbookB.setOnlineStatus(false);

  // PollbookC rejoins the network
  pollbookC.setOnlineStatus(true);

  // Sync events between PollbookA and PollbookC
  syncTimes = syncEventsForAllPollbooks([pollbookA, pollbookC], syncTimes);

  // Verify PollbookA has Carl's check-in from PollbookC
  expect(pollbookA.getCheckInCount()).toEqual(6);
  expect(pollbookC.getCheckInCount()).toEqual(6);
  expect(pollbookA.searchVoters({ firstName: 'Carl', lastName: '' })).toEqual([
    expect.objectContaining({
      voterId: 'carl',
      checkIn: expect.objectContaining({
        identificationMethod: { type: 'photoId', state: 'nh' },
        machineId: 'pollbook-c',
      }),
    }),
  ]);

  // PollbookC is shutdown
  pollbookC.setOnlineStatus(false);

  // PollbookB rejoins the network
  pollbookB.setOnlineStatus(true);

  // Sync events between PollbookA and PollbookB
  syncTimes = syncEventsForAllPollbooks([pollbookA, pollbookB], syncTimes);

  // Verify PollbookB has Carl's check-in from PollbookA
  expect(pollbookB.getCheckInCount()).toEqual(6);
  expect(pollbookB.searchVoters({ firstName: 'Carl', lastName: '' })).toEqual([
    expect.objectContaining({
      voterId: 'carl',
      checkIn: expect.objectContaining({
        identificationMethod: { type: 'photoId', state: 'nh' },
        machineId: 'pollbook-c',
      }),
    }),
  ]);
  // This is unchanged
  expect(pollbookA.getCheckInCount()).toEqual(6);
});
