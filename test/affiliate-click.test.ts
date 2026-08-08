import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAffiliateClickPayload, shouldTrack } from '../src/lib/client.ts';

test('shouldTrack is true only when consent is granted and Umami is present', () => {
  assert.equal(shouldTrack('granted', true), true);
  assert.equal(shouldTrack('granted', false), false);
  assert.equal(shouldTrack('denied', true), false);
  assert.equal(shouldTrack('undecided', true), false);
  assert.equal(shouldTrack('gpc', true), false);
});

test('buildAffiliateClickPayload returns the full payload with channel', () => {
  assert.deepEqual(
    buildAffiliateClickPayload({ key: 'atomicHabits', channel: 'medium', program: 'amazon' }),
    { key: 'atomicHabits', channel: 'medium', program: 'amazon' }
  );
});

test('buildAffiliateClickPayload defaults channel to "default" when absent', () => {
  assert.deepEqual(buildAffiliateClickPayload({ key: 'atomicHabits', program: 'amazon' }), {
    key: 'atomicHabits',
    channel: 'default',
    program: 'amazon',
  });
});

test('buildAffiliateClickPayload defaults channel to "default" when null (missing DOM attribute)', () => {
  assert.deepEqual(
    buildAffiliateClickPayload({ key: 'atomicHabits', channel: null, program: 'amazon' }),
    { key: 'atomicHabits', channel: 'default', program: 'amazon' }
  );
});

test('buildAffiliateClickPayload returns null when key is missing', () => {
  assert.equal(buildAffiliateClickPayload({ program: 'amazon' }), null);
});

test('buildAffiliateClickPayload returns null when program is missing', () => {
  assert.equal(buildAffiliateClickPayload({ key: 'atomicHabits' }), null);
});

test('buildAffiliateClickPayload returns null when both key and program are missing', () => {
  assert.equal(buildAffiliateClickPayload({}), null);
});
