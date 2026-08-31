import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSENT_STORAGE_KEY, gpcDenied, readConsent, writeConsent } from '../src/lib/consent.ts';

class FakeStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const AT = new Date().toISOString();

const DAY_MS = 86_400_000;
const daysAgo = (days: number): string => new Date(Date.now() - days * DAY_MS).toISOString();

test('readConsent returns null when nothing is stored', () => {
  assert.equal(readConsent(new FakeStorage(), 1), null);
});

test('readConsent returns null for malformed JSON', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, '{not json');
  assert.equal(readConsent(storage, 1), null);
});

test('readConsent returns null when the stored version does not match', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'granted', at: AT }));
  assert.equal(readConsent(storage, 2), null);
});

test('readConsent returns null when the v field is absent entirely', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ decision: 'granted', at: AT }));
  assert.equal(readConsent(storage, 1), null);
});

test('readConsent returns null for an invalid decision value', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'maybe', at: AT }));
  assert.equal(readConsent(storage, 1), null);
});

test('readConsent returns null when decision is explicitly null', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: null, at: AT }));
  assert.equal(readConsent(storage, 1), null);
});

test('readConsent returns null when storage.getItem throws', () => {
  const throwingStorage = {
    getItem(): string {
      throw new Error('storage unavailable');
    },
  };
  assert.equal(readConsent(throwingStorage, 1), null);
});

test('readConsent returns the stored decision for a valid granted record', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'granted', at: AT }));
  assert.equal(readConsent(storage, 1), 'granted');
});

test('readConsent returns the stored decision for a valid denied record', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'denied', at: AT }));
  assert.equal(readConsent(storage, 1), 'denied');
});

test('writeConsent stores the exact record shape under the consent key', () => {
  const calls: Array<{ key: string; value: string }> = [];
  const storage = {
    setItem(key: string, value: string) {
      calls.push({ key, value });
    },
  };
  writeConsent(storage, 1, 'granted', AT);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].key, CONSENT_STORAGE_KEY);
  assert.deepEqual(JSON.parse(calls[0].value), { v: 1, decision: 'granted', at: AT });
});

test('writeConsent swallows a storage.setItem throw', () => {
  const throwingStorage = {
    setItem(): void {
      throw new Error('quota exceeded');
    },
  };
  assert.doesNotThrow(() => writeConsent(throwingStorage, 1, 'denied', AT));
});

test('gpcDenied is true only when globalPrivacyControl is exactly true', () => {
  assert.equal(gpcDenied({ globalPrivacyControl: true }), true);
  assert.equal(gpcDenied({ globalPrivacyControl: false }), false);
  assert.equal(gpcDenied({}), false);
});

test('writeConsent then readConsent round-trips the decision through the same storage', () => {
  const storage = new FakeStorage();
  writeConsent(storage, 1, 'granted', AT);
  assert.equal(readConsent(storage, 1), 'granted');
});

test('readConsent returns null when the record is older than maxAgeDays', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'granted', at: daysAgo(400) }));
  assert.equal(readConsent(storage, 1, 365), null);
});

test('readConsent returns the decision when the record is within maxAgeDays', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'denied', at: daysAgo(1) }));
  assert.equal(readConsent(storage, 1, 365), 'denied');
});

test('readConsent applies expiry to a denied decision too, not just granted', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'denied', at: daysAgo(400) }));
  assert.equal(readConsent(storage, 1, 365), null);
});

test('readConsent never expires when maxAgeDays is 0', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'granted', at: daysAgo(4000) }));
  assert.equal(readConsent(storage, 1, 0), 'granted');
});

test('readConsent never expires when maxAgeDays is Infinity', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'granted', at: daysAgo(4000) }));
  assert.equal(readConsent(storage, 1, Infinity), 'granted');
});

test('readConsent never expires when maxAgeDays arrives as null (Infinity round-tripped through JSON)', () => {
  const roundTripped = JSON.parse(JSON.stringify({ maxAgeDays: Infinity })).maxAgeDays;
  assert.equal(roundTripped, null);

  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'granted', at: daysAgo(4000) }));
  assert.equal(readConsent(storage, 1, roundTripped as unknown as number), 'granted');
});

test('readConsent treats a missing at field as expired once expiry is enabled', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'granted' }));
  assert.equal(readConsent(storage, 1, 365), null);
});

test('readConsent treats an unparseable at value as expired once expiry is enabled', () => {
  const storage = new FakeStorage();
  storage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ v: 1, decision: 'granted', at: 'not-a-date' })
  );
  assert.equal(readConsent(storage, 1, 365), null);
});

test('readConsent applies the default 365-day maxAgeDays when the argument is omitted', () => {
  const storage = new FakeStorage();
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ v: 1, decision: 'granted', at: daysAgo(400) }));
  assert.equal(readConsent(storage, 1), null);
});
