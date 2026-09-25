import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUmamiPayload,
  buildUmamiUrl,
  createUmamiSender,
  normalizeUmamiHref,
  shouldSuppressUmami,
  type UmamiPayload,
} from '../src/lib/umami-api.ts';
import { umami, umamiApiEndpoint } from '../src/lib/adapters/umami.ts';
import type { UmamiApiTrackerAdapter } from '../src/lib/types.ts';

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

test('umami() adapter default privacyInfo has no collects override - the corrected whatsCollectedBody already discloses it', () => {
  const tracker = umami(BASE_OPTIONS);
  assert.equal(tracker.privacyInfo?.collects, undefined);
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

test('shouldSuppressUmami honors Do Not Track for a hand-built adapter that omits respectDoNotTrack', () => {
  const handBuilt: UmamiApiTrackerAdapter = {
    kind: 'umami-api',
    endpoint: 'https://umami.example.net/api/send',
    websiteId: 'abc',
  };
  assert.equal(shouldSuppressUmami(handBuilt, 'example.com', '1'), true);
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

test('normalizeUmamiHref keeps the absolute href intact by default', () => {
  assert.equal(
    normalizeUmamiHref(BASE, 'https://example.com/gear?ref=x#section'),
    'https://example.com/gear?ref=x#section'
  );
});

test('normalizeUmamiHref strips search and hash per config', () => {
  const tracker = umami({ ...BASE_OPTIONS, excludeSearch: true, excludeHash: true });
  assert.equal(normalizeUmamiHref(tracker, 'https://example.com/gear?ref=x#section'), 'https://example.com/gear');
});

function withBrowserStubs(
  initial: { href: string; referrer?: string },
  run: (navigate: (href: string) => void, sent: UmamiPayload[]) => void
): void {
  const g = globalThis as Record<string, unknown>;
  const saved = { location: g.location, document: g.document, screen: g.screen, fetch: g.fetch };
  const sent: UmamiPayload[] = [];
  const setLocation = (href: string): void => {
    const url = new URL(href);
    g.location = { href: url.href, hostname: url.hostname, origin: url.origin };
  };
  setLocation(initial.href);
  g.document = { title: 'Page', referrer: initial.referrer ?? '' };
  g.screen = { width: 1920, height: 1080 };
  g.fetch = (_endpoint: string, init: { body: string }) => {
    sent.push(JSON.parse(init.body).payload);
    return Promise.resolve({ json: () => Promise.resolve({}) });
  };
  try {
    run(setLocation, sent);
  } finally {
    Object.assign(g, saved);
  }
}

for (const [flag, marker] of [
  ['excludeSearch', '?'],
  ['excludeHash', '#'],
] as const) {
  test(`createUmamiSender keeps ${flag}'s stripped part out of url and referrer across consecutive sends`, () => {
    withBrowserStubs({ href: 'https://example.com/a?x=1#h' }, (navigate, sent) => {
      const sender = createUmamiSender(umami({ ...BASE_OPTIONS, [flag]: true }));
      sender.pageview();
      navigate('https://example.com/b?y=2#j');
      sender.pageview();
      sender.event('affiliate-click', { key: 'k', channel: 'default', program: 'amazon' });

      assert.equal(sent.length, 3);
      for (const payload of sent) {
        assert.ok(!payload.url.includes(marker), `url ${payload.url}`);
        assert.ok(!payload.referrer.includes(marker), `referrer ${payload.referrer}`);
      }
      assert.equal(sent[0].referrer, '');
      assert.match(sent[1].referrer, /^https:\/\/example\.com\/a/);
      assert.match(sent[2].referrer, /^https:\/\/example\.com\/b/);
    });
  });

  test(`createUmamiSender applies ${flag} to a cross-origin initial referrer`, () => {
    withBrowserStubs(
      { href: 'https://example.com/a', referrer: 'https://other.example/post?utm=1#top' },
      (_navigate, sent) => {
        createUmamiSender(umami({ ...BASE_OPTIONS, [flag]: true })).pageview();
        assert.match(sent[0].referrer, /^https:\/\/other\.example\/post/);
        assert.ok(!sent[0].referrer.includes(marker), `referrer ${sent[0].referrer}`);
      }
    );
  });
}

test('createUmamiSender leaves the referrer untouched when neither flag is set', () => {
  withBrowserStubs({ href: 'https://example.com/a?x=1#h' }, (navigate, sent) => {
    const sender = createUmamiSender(BASE);
    sender.pageview();
    navigate('https://example.com/b');
    sender.pageview();
    assert.equal(sent[1].referrer, 'https://example.com/a?x=1#h');
  });
});
