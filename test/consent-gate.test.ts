import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { serializeTrackers } from '../src/lib/serialize-trackers.ts';
import { umami } from '../src/lib/adapters/umami.ts';
import { cloudflareBeacon } from '../src/lib/adapters/cloudflare-beacon.ts';
import { CONSENT_STORAGE_KEY, readConsent, writeConsent } from '../src/lib/consent.ts';

type ClientModule = typeof import('../src/lib/client.ts');

const CONSENT_VERSION = 1;
const MAX_AGE_DAYS = 365;
const UMAMI_ENDPOINT = 'https://umami.example.net/api/send';

const TRACKERS = serializeTrackers([
  cloudflareBeacon({ token: 'cf-token' }),
  umami({ src: 'https://umami.example.net/script.js', websiteId: 'site-id' }),
]);

interface RecordedFetch {
  url: string;
  body: { type: string; payload: { name?: string; website: string } };
}

let fetches: RecordedFetch[] = [];
let importCount = 0;

// Module-level listener flags and the Umami sender map live in client.ts, so
// every test gets its own copy of the module (and its own window, since the
// gate binds its choose listener on document).
async function freshClient(): Promise<ClientModule> {
  importCount += 1;
  return (await import(`../src/lib/client.ts?test=${importCount}`)) as ClientModule;
}

function mountConfig(): void {
  const el = document.createElement('script');
  el.type = 'application/json';
  el.id = 'oia-config';
  el.textContent = JSON.stringify({ trackers: TRACKERS, version: CONSENT_VERSION, maxAgeDays: MAX_AGE_DAYS });
  document.body.appendChild(el);
}

function setGpc(enabled: boolean): void {
  Object.defineProperty(navigator, 'globalPrivacyControl', { value: enabled, configurable: true });
}

function storeDecision(decision: 'granted' | 'denied'): void {
  writeConsent(localStorage, CONSENT_VERSION, decision, new Date().toISOString());
}

function trackerElements(): Element[] {
  return [...document.head.querySelectorAll('[id^="oia-tracker-"]')];
}

function state(): string | null {
  return document.documentElement.getAttribute('data-oia-state');
}

function assertNothingLoaded(): void {
  assert.equal(trackerElements().length, 0, 'no tracker element in <head>');
  assert.equal(fetches.length, 0, 'no fetch call');
}

function assertTrackersLoaded(): void {
  const scripts = trackerElements();
  assert.equal(scripts.length, 1, 'one injected script tracker');
  assert.equal(scripts[0].id, 'oia-tracker-0');
  assert.equal(scripts[0].getAttribute('src'), 'https://static.cloudflareinsights.com/beacon.min.js');
  assert.equal(fetches.length, 1, 'exactly one umami request');
  assert.equal(fetches[0].url, UMAMI_ENDPOINT);
  assert.equal(fetches[0].body.type, 'event');
  assert.equal(fetches[0].body.payload.website, 'site-id');
  assert.equal(fetches[0].body.payload.name, undefined, 'a pageview, not a custom event');
}

beforeEach(() => {
  GlobalRegistrator.register({
    url: 'https://example.com/post',
    width: 1920,
    height: 1080,
    settings: {
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      handleDisabledFileLoadingAsSuccess: true,
    },
  });
  fetches = [];
  globalThis.fetch = ((url: string, init: { body: string }) => {
    fetches.push({ url, body: JSON.parse(init.body) });
    return Promise.resolve(new Response('{}'));
  }) as typeof fetch;
  setGpc(false);
});

afterEach(async () => {
  await GlobalRegistrator.unregister();
});

test('./client exports only the documented functions and the two boot entry points', async () => {
  const client = await freshClient();
  assert.deepEqual(Object.keys(client).sort(), [
    'bootConsentGate',
    'bootConsentPrompt',
    'openConsentPrompt',
    'trackEvent',
  ]);
});

test('GPC: sets gpc state and loads nothing, even with a stored grant', async () => {
  setGpc(true);
  storeDecision('granted');
  mountConfig();
  const client = await freshClient();

  client.bootConsentGate();

  assert.equal(state(), 'gpc');
  assertNothingLoaded();
});

test('stored denial loads nothing', async () => {
  storeDecision('denied');
  mountConfig();
  const client = await freshClient();

  client.bootConsentGate();

  assert.equal(state(), 'denied');
  assertNothingLoaded();
});

test('an undecided visitor loads nothing', async () => {
  mountConfig();
  const client = await freshClient();

  client.bootConsentGate();

  assert.equal(state(), 'undecided');
  assertNothingLoaded();
});

test('a stored grant injects the beacon script and sends exactly one umami pageview', async () => {
  storeDecision('granted');
  mountConfig();
  const client = await freshClient();

  client.bootConsentGate();

  assert.equal(state(), 'granted');
  assertTrackersLoaded();
});

test('choosing grant after boot loads trackers and stores the grant', async () => {
  mountConfig();
  const client = await freshClient();
  client.bootConsentGate();
  assertNothingLoaded();

  document.dispatchEvent(new CustomEvent('oia:choose', { detail: 'granted' }));

  assert.equal(state(), 'granted');
  assertTrackersLoaded();
  assert.equal(readConsent(localStorage, CONSENT_VERSION, MAX_AGE_DAYS), 'granted');
});

test('choosing deny after boot loads nothing and stores the denial', async () => {
  mountConfig();
  const client = await freshClient();
  client.bootConsentGate();

  document.dispatchEvent(new CustomEvent('oia:choose', { detail: 'denied' }));

  assert.equal(state(), 'denied');
  assertNothingLoaded();
  assert.equal(readConsent(localStorage, CONSENT_VERSION, MAX_AGE_DAYS), 'denied');
  assert.ok(localStorage.getItem(CONSENT_STORAGE_KEY));
});

function mountPrompt(): HTMLElement {
  const prompt = document.createElement('div');
  prompt.id = 'oia-prompt';
  prompt.hidden = true;
  prompt.innerHTML =
    '<button type="button" data-oia-decline>No thanks</button><button type="button" data-oia-accept>Allow</button>';
  document.body.appendChild(prompt);
  return prompt;
}

test('re-booting the prompt after a soft navigation binds the fresh prompt buttons', async () => {
  const client = await freshClient();
  const choices: string[] = [];
  document.addEventListener('oia:choose', (event) => choices.push((event as CustomEvent<string>).detail));

  mountPrompt();
  client.bootConsentPrompt();
  document.getElementById('oia-prompt')!.remove();
  const fresh = mountPrompt();
  client.bootConsentPrompt();

  assert.equal(fresh.hidden, false, 'fresh prompt revealed for an undecided visitor');
  fresh.querySelector<HTMLButtonElement>('[data-oia-accept]')!.click();

  assert.deepEqual(choices, ['granted']);
  assert.equal(fresh.hidden, true, 'answered prompt hides itself');
});
