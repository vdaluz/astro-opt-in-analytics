import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defineAnalyticsConfig, resolveAnalyticsConfig } from '../src/lib/config.ts';
import { cloudflareBeacon } from '../src/lib/adapters/cloudflare-beacon.ts';
import type { AnalyticsConfig } from '../src/lib/types.ts';

const tracker = cloudflareBeacon({ token: 'abc' });
const prompt = { message: 'Track?', accept: 'Yes', decline: 'No' };

test('defineAnalyticsConfig fills consentVersion 1 and consentMaxAgeDays 365', () => {
  const config = defineAnalyticsConfig({ tracker, prompt });
  assert.equal(config.consentVersion, 1);
  assert.equal(config.consentMaxAgeDays, 365);
});

test('defineAnalyticsConfig keeps explicit values, including a 0 that disables expiry', () => {
  const config = defineAnalyticsConfig({ tracker, prompt, consentVersion: 3, consentMaxAgeDays: 0 });
  assert.equal(config.consentVersion, 3);
  assert.equal(config.consentMaxAgeDays, 0);
});

test('defineAnalyticsConfig normalizes a single tracker to an array', () => {
  assert.deepEqual(defineAnalyticsConfig({ tracker, prompt }).tracker, [tracker]);
});

test('resolveAnalyticsConfig is idempotent, so components can resolve an already-resolved config', () => {
  const once = defineAnalyticsConfig({ tracker: [tracker, tracker], prompt });
  assert.deepEqual(resolveAnalyticsConfig(once), once);
});

test('resolveAnalyticsConfig resolves a raw config literal passed to a component directly', () => {
  const raw: AnalyticsConfig = { tracker, prompt };
  assert.deepEqual(resolveAnalyticsConfig(raw), defineAnalyticsConfig(raw));
});
