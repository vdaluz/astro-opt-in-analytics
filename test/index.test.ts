import { test } from 'node:test';
import assert from 'node:assert/strict';

test('the package entry resolves under Node and exposes exactly its documented value exports', async () => {
  const barrel = await import('../src/index.ts');
  assert.deepEqual(
    Object.keys(barrel).sort(),
    ['CONSENT_STORAGE_KEY', 'cloudflareBeacon', 'defineAnalyticsConfig', 'gpcDenied', 'readConsent', 'umami', 'writeConsent'].sort(),
  );
});
