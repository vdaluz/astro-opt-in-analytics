import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPendingAction } from '../src/lib/pending-action.ts';

test('cancel() is a no-op when nothing is pending', () => {
  const pending = createPendingAction();
  assert.doesNotThrow(() => pending.cancel());
});

test('cancel() invokes the pending action exactly once', () => {
  const pending = createPendingAction();
  let calls = 0;
  pending.set(() => {
    calls++;
  });
  pending.cancel();
  assert.equal(calls, 1);
  pending.cancel();
  assert.equal(calls, 1);
});

test('set() invokes and replaces a previously pending action', () => {
  const pending = createPendingAction();
  let first = 0;
  let second = 0;
  pending.set(() => {
    first++;
  });
  pending.set(() => {
    second++;
  });
  assert.equal(first, 1);
  assert.equal(second, 0);
  pending.cancel();
  assert.equal(second, 1);
});

test('set() after a cancel() does not re-invoke the cancelled action', () => {
  const pending = createPendingAction();
  let calls = 0;
  pending.set(() => {
    calls++;
  });
  pending.cancel();
  pending.set(() => {
    calls++;
  });
  assert.equal(calls, 1);
  pending.cancel();
  assert.equal(calls, 2);
});
