import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeStorage } from '../src/lib/client.ts';

test('safeStorage returns null when window is unavailable (no DOM in this test environment)', () => {
  assert.equal(safeStorage(), null);
});

test('safeStorage returns null when accessing window.localStorage throws', () => {
  const fakeWindow = {
    get localStorage(): Storage {
      throw new Error('SecurityError: access denied');
    },
  };
  (globalThis as { window?: unknown }).window = fakeWindow;
  try {
    assert.equal(safeStorage(), null);
  } finally {
    delete (globalThis as { window?: unknown }).window;
  }
});

test('safeStorage returns the storage object when accessible', () => {
  const fakeStorage = { getItem: () => null, setItem: () => {} } as unknown as Storage;
  (globalThis as { window?: unknown }).window = { localStorage: fakeStorage };
  try {
    assert.equal(safeStorage(), fakeStorage);
  } finally {
    delete (globalThis as { window?: unknown }).window;
  }
});
