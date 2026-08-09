import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeTrackers } from '../src/lib/serialize-trackers.ts';
import { umami } from '../src/lib/adapters/umami.ts';
import { cloudflareBeacon } from '../src/lib/adapters/cloudflare-beacon.ts';

test('serializeTrackers nests a umami-api tracker under `config` (the shape client.ts reads back)', () => {
  const tracker = umami({ src: 'https://umami.example.net/script.js', websiteId: 'abc' });
  const [serialized] = serializeTrackers([tracker]);
  assert.equal(serialized.kind, 'umami-api');
  if (serialized.kind !== 'umami-api') throw new Error('unreachable');
  assert.equal(serialized.config.endpoint, 'https://umami.example.net/api/send');
  assert.equal(serialized.config.websiteId, 'abc');
  // privacyInfo must never reach the client payload - it's PrivacyExplainer-only metadata.
  assert.equal('privacyInfo' in serialized.config, false);
});

test('serializeTrackers keeps a script tracker as attrs, unnested', () => {
  const tracker = cloudflareBeacon({ token: 'tok' });
  const [serialized] = serializeTrackers([tracker]);
  assert.equal(serialized.kind, 'script');
  if (serialized.kind !== 'script') throw new Error('unreachable');
  assert.equal(serialized.attrs.src, 'https://static.cloudflareinsights.com/beacon.min.js');
  assert.equal('privacyInfo' in serialized, false);
});

test('serializeTrackers preserves order across a mixed tracker list', () => {
  const trackers = [
    umami({ src: 'https://umami.example.net/script.js', websiteId: 'abc' }),
    cloudflareBeacon({ token: 'tok' }),
  ];
  const serialized = serializeTrackers(trackers);
  assert.deepEqual(
    serialized.map((t) => t.kind),
    ['umami-api', 'script']
  );
});
