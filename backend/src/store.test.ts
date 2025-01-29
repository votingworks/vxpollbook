import { assert, sleep } from '@votingworks/basics';
import { HybridLogicalClock } from './hybrid_logical_clock';
import { createVoterCheckInEvent } from './test_helpers';
import { Store } from './store';

export const myMachineId = 'machine-1';
const otherMachineId = 'machine-2';

test('getNewEvents returns events for unknown machines', () => {
  const store = Store.memoryStore(myMachineId);
  const myHlcClock = new HybridLogicalClock(myMachineId);
  const theirHlcClock = new HybridLogicalClock(otherMachineId);
  const event1 = createVoterCheckInEvent(
    1,
    myMachineId,
    'voter-1',
    myHlcClock.tick()
  );
  const event2 = createVoterCheckInEvent(
    1,
    otherMachineId,
    'voter-2',
    theirHlcClock.tick()
  );

  store.saveEvent(event1);
  store.saveEvent(event2);

  const knownMachines: Record<string, number> = {};
  const { events, hasMore } = store.getNewEvents(knownMachines);

  assert(events.length === 2);
  expect(events).toEqual([event1, event2]);
  expect(hasMore).toEqual(false);
});

test('getNewEvents returns events for known machines with new events', () => {
  const store = Store.memoryStore(myMachineId);
  const myClock = new HybridLogicalClock(myMachineId);
  const theirClock = new HybridLogicalClock(otherMachineId);
  const event1 = createVoterCheckInEvent(
    1,
    myMachineId,
    'voter-1',
    myClock.tick()
  );
  const event2 = createVoterCheckInEvent(
    1,
    otherMachineId,
    'voter-2',
    theirClock.tick()
  );
  const event3 = createVoterCheckInEvent(
    2,
    myMachineId,
    'voter-3',
    myClock.tick()
  );

  store.saveEvent(event1);
  store.saveEvent(event2);
  store.saveEvent(event3);

  const knownMachines: Record<string, number> = {
    [myMachineId]: 1,
    [otherMachineId]: 1,
  };
  const { events, hasMore } = store.getNewEvents(knownMachines);

  assert(events.length === 1);
  expect(events).toEqual([event3]);
  expect(hasMore).toEqual(false);
});

test('getNewEvents returns no events for known machines and unknown machines', async () => {
  const store = Store.memoryStore(myMachineId);
  const myClock = new HybridLogicalClock(myMachineId);
  const theirClock = new HybridLogicalClock(otherMachineId);
  const event1 = createVoterCheckInEvent(
    1,
    myMachineId,
    'voter-1',
    myClock.tick()
  );
  const event2 = createVoterCheckInEvent(
    2,
    myMachineId,
    'voter-2',
    myClock.tick()
  );
  const event3 = createVoterCheckInEvent(
    3,
    myMachineId,
    'voter-3',
    myClock.tick()
  );
  const event4 = createVoterCheckInEvent(
    4,
    myMachineId,
    'voter-4',
    myClock.tick()
  );
  const event5 = createVoterCheckInEvent(
    5,
    myMachineId,
    'voter-5',
    myClock.tick()
  );
  await sleep(10);
  const event6 = createVoterCheckInEvent(
    1,
    otherMachineId,
    'voter-6',
    theirClock.tick()
  );
  const event7 = createVoterCheckInEvent(
    2,
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

  const knownMachines: Record<string, number> = {
    [myMachineId]: 3,
    'not-a-machine': 1,
  };
  const { events, hasMore } = store.getNewEvents(knownMachines);

  assert(events.length === 4);
  expect(events).toEqual([event6, event7, event4, event5]); // order is not guaranteed to follow HLC
  expect(hasMore).toEqual(false);
});
