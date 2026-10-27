import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cloudflareBeacon,
  CLOUDFLARE_BEACON_COLLECTS,
} from '../src/lib/adapters/cloudflare-beacon.ts';

test('cloudflareBeacon() default privacyInfo discloses what the beacon collects', () => {
  const tracker = cloudflareBeacon({ token: 'abc' });
  assert.deepEqual(tracker.privacyInfo?.collects, CLOUDFLARE_BEACON_COLLECTS);
});

test('cloudflareBeacon() default privacyInfo still sets label/toolName/learnMoreUrl', () => {
  const tracker = cloudflareBeacon({ token: 'abc' });
  assert.equal(tracker.privacyInfo?.toolName, 'Cloudflare Web Analytics');
  assert.equal(tracker.privacyInfo?.learnMoreUrl, 'https://www.cloudflare.com/web-analytics/');
});

test('cloudflareBeacon() keeps the default collects when a site overrides label and description', () => {
  const tracker = cloudflareBeacon({
    token: 'abc',
    privacyInfo: {
      label: { default: 'Custom label', es: 'Etiqueta' },
      toolName: 'Cloudflare Web Analytics',
      learnMoreUrl: 'https://www.cloudflare.com/web-analytics/',
      description: 'which rides along with the CDN.',
    },
  });
  assert.deepEqual(tracker.privacyInfo?.label, { default: 'Custom label', es: 'Etiqueta' });
  assert.equal(tracker.privacyInfo?.description, 'which rides along with the CDN.');
  assert.deepEqual(tracker.privacyInfo?.collects, CLOUDFLARE_BEACON_COLLECTS);
});

test('cloudflareBeacon() lets a site replace the collects list', () => {
  const tracker = cloudflareBeacon({ token: 'abc', privacyInfo: { collects: ['only this'] } });
  assert.deepEqual(tracker.privacyInfo?.collects, ['only this']);
  assert.equal(tracker.privacyInfo?.toolName, 'Cloudflare Web Analytics');
});

test('every default collects entry has en, es and pt copy', () => {
  for (const entry of CLOUDFLARE_BEACON_COLLECTS) {
    assert.equal(typeof entry, 'object');
    const localized = entry as Record<string, string>;
    for (const locale of ['default', 'es', 'pt']) assert.ok(localized[locale], locale);
  }
});
