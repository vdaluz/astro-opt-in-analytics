import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareBeacon } from '../src/lib/adapters/cloudflare-beacon.ts';

test('cloudflareBeacon() default privacyInfo has no collects - the beacon script is a third party we cannot independently verify', () => {
  const tracker = cloudflareBeacon({ token: 'abc' });
  assert.equal(tracker.privacyInfo?.collects, undefined);
});

test('cloudflareBeacon() default privacyInfo still sets label/toolName/learnMoreUrl', () => {
  const tracker = cloudflareBeacon({ token: 'abc' });
  assert.equal(tracker.privacyInfo?.toolName, 'Cloudflare Web Analytics');
  assert.equal(tracker.privacyInfo?.learnMoreUrl, 'https://www.cloudflare.com/web-analytics/');
});
