import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUmamiPayload, buildUmamiUrl, shouldSuppressUmami } from '../src/lib/umami-api.ts';
import { umami, umamiApiEndpoint } from '../src/lib/adapters/umami.ts';

test('umamiApiEndpoint derives /api/send from the script src', () => {
  assert.equal(
    umamiApiEndpoint('https://umami.example.net/script.js'),
    'https://umami.example.net/api/send'
  );
});

test('umami() adapter carries endpoint/websiteId and defaults respectDoNotTrack to true', () => {
  const tracker = umami({ src: 'https://umami.example.net/script.js', websiteId: 'abc' });
  assert.equal(tracker.kind, 'umami-api');
  assert.equal(tracker.endpoint, 'https://umami.example.net/api/send');
  assert.equal(tracker.websiteId, 'abc');
  assert.equal(tracker.respectDoNotTrack, true);
});

test('umami() adapter passes through domains/excludeSearch/excludeHash', () => {
  const tracker = umami({
    src: 'https://umami.example.net/script.js',
    websiteId: 'abc',
    domains: ['example.com'],
    excludeSearch: true,
    excludeHash: true,
  });
  assert.deepEqual(tracker.domains, ['example.com']);
  assert.equal(tracker.excludeSearch, true);
  assert.equal(tracker.excludeHash, true);
});

const BASE_OPTIONS = { src: 'https://umami.example.net/script.js', websiteId: 'abc' };
const BASE = umami(BASE_OPTIONS);

test('shouldSuppressUmami is false with no domains restriction and no DNT signal', () => {
  assert.equal(shouldSuppressUmami(BASE, 'example.com', null), false);
});

test('shouldSuppressUmami suppresses when hostname is outside the configured domains list', () => {
  const tracker = umami({ ...BASE_OPTIONS, domains: ['example.com'] });
  assert.equal(shouldSuppressUmami(tracker, 'other.com', null), true);
  assert.equal(shouldSuppressUmami(tracker, 'example.com', null), false);
});

test('shouldSuppressUmami suppresses on a "1" or "yes" Do Not Track signal when respectDoNotTrack is set', () => {
  assert.equal(shouldSuppressUmami(BASE, 'example.com', '1'), true);
  assert.equal(shouldSuppressUmami(BASE, 'example.com', 'yes'), true);
  assert.equal(shouldSuppressUmami(BASE, 'example.com', '0'), false);
});

test('shouldSuppressUmami ignores Do Not Track when respectDoNotTrack is false', () => {
  const tracker = umami({ ...BASE_OPTIONS, respectDoNotTrack: false });
  assert.equal(shouldSuppressUmami(tracker, 'example.com', '1'), false);
});

test('buildUmamiUrl keeps search and hash by default', () => {
  assert.equal(
    buildUmamiUrl(BASE, 'https://example.com/gear?ref=x#section'),
    '/gear?ref=x#section'
  );
});

test('buildUmamiUrl strips search when excludeSearch is set', () => {
  const tracker = umami({ ...BASE_OPTIONS, excludeSearch: true });
  assert.equal(buildUmamiUrl(tracker, 'https://example.com/gear?ref=x#section'), '/gear#section');
});

test('buildUmamiUrl strips hash when excludeHash is set', () => {
  const tracker = umami({ ...BASE_OPTIONS, excludeHash: true });
  assert.equal(buildUmamiUrl(tracker, 'https://example.com/gear?ref=x#section'), '/gear?ref=x');
});

test('buildUmamiPayload builds a pageview payload with no name/data', () => {
  const payload = buildUmamiPayload(BASE, {
    url: '/gear',
    referrer: '',
    hostname: 'example.com',
    language: 'en-US',
    screen: '1920x1080',
    title: 'Gear',
  });
  assert.deepEqual(payload, {
    website: 'abc',
    url: '/gear',
    referrer: '',
    hostname: 'example.com',
    language: 'en-US',
    screen: '1920x1080',
    title: 'Gear',
  });
});

test('buildUmamiPayload includes name/data for a custom event', () => {
  const payload = buildUmamiPayload(
    BASE,
    { url: '/gear', referrer: '', hostname: 'example.com', language: 'en-US', screen: '1920x1080', title: 'Gear' },
    { name: 'affiliate-click', data: { key: 'atomicHabits', channel: 'default', program: 'amazon' } }
  );
  assert.equal(payload.name, 'affiliate-click');
  assert.deepEqual(payload.data, { key: 'atomicHabits', channel: 'default', program: 'amazon' });
});
