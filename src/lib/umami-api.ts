import type { UmamiApiTrackerAdapter } from './types.ts';

/** The fields the sender actually needs - `kind`/`privacyInfo` never reach this module,
 * so callers (client.ts, deserializing JSON) don't have to fabricate them. */
export type UmamiSenderConfig = Omit<UmamiApiTrackerAdapter, 'kind' | 'privacyInfo'>;

export interface UmamiPayload {
  website: string;
  url: string;
  referrer: string;
  hostname: string;
  language: string;
  screen: string;
  title: string;
  name?: string;
  data?: Record<string, string>;
}

/** Pure decision extracted from the sender so it's testable without a DOM. */
export function shouldSuppressUmami(
  config: UmamiSenderConfig,
  hostname: string,
  doNotTrackSignal: string | null
): boolean {
  if (config.domains?.length && !config.domains.includes(hostname)) return true;
  if (config.respectDoNotTrack && (doNotTrackSignal === '1' || doNotTrackSignal === 'yes')) return true;
  return false;
}

/** Strips search/hash per config, mirroring Umami's own script's data-exclude-search/-hash,
 * which it applies to both the url and referrer fields. */
export function normalizeUmamiHref(config: UmamiSenderConfig, href: string): string {
  const url = new URL(href);
  if (config.excludeSearch) url.search = '';
  if (config.excludeHash) url.hash = '';
  return url.href;
}

export function buildUmamiUrl(config: UmamiSenderConfig, href: string): string {
  const url = new URL(normalizeUmamiHref(config, href));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildUmamiPayload(
  config: UmamiSenderConfig,
  ctx: { url: string; referrer: string; hostname: string; language: string; screen: string; title: string },
  extra?: { name: string; data?: Record<string, string> }
): UmamiPayload {
  return {
    website: config.websiteId,
    url: ctx.url,
    referrer: ctx.referrer,
    hostname: ctx.hostname,
    language: ctx.language,
    screen: ctx.screen,
    title: ctx.title,
    ...(extra ? { name: extra.name, data: extra.data } : {}),
  };
}

interface DoNotTrackNavigator extends Navigator {
  msDoNotTrack?: string;
}

function currentDoNotTrackSignal(): string | null {
  const nav = navigator as DoNotTrackNavigator;
  return nav.doNotTrack ?? nav.msDoNotTrack ?? null;
}

/** document.referrer, but blanked when it's same-origin (e.g. a soft reload), matching Umami's own script. */
function initialReferrer(config: UmamiSenderConfig): string {
  const ref = document.referrer;
  if (!ref) return '';
  try {
    return new URL(ref).origin === location.origin ? '' : normalizeUmamiHref(config, ref);
  } catch {
    return ref;
  }
}

export interface UmamiSender {
  pageview: () => void;
  event: (name: string, data?: Record<string, string>) => void;
}

/**
 * Reports directly to Umami's documented /api/send endpoint instead of loading the official
 * tracker script, which never initializes when injected dynamically post-consent (its init
 * gates on document.currentScript, which is null for a script this package appends itself -
 * see astro-opt-in-analytics CHANGELOG v0.7.0). One sender per page load holds the session-cache
 * token and previous-URL/referrer state Umami's own script would otherwise track internally.
 */
export function createUmamiSender(config: UmamiSenderConfig): UmamiSender {
  let previousUrl: string | null = null;
  /** Absolute previous href (the form Umami's own script sends as referrer), already
   * normalized so the next request's referrer honours excludeSearch/excludeHash like `url`. */
  let previousHref: string | null = null;
  let cacheToken: string | undefined;

  function send(extra?: { name: string; data?: Record<string, string> }): void {
    if (shouldSuppressUmami(config, location.hostname, currentDoNotTrackSignal())) return;

    const currentHref = location.href;
    const url = buildUmamiUrl(config, currentHref);
    if (!extra && url === previousUrl) return;
    const referrer = previousHref ?? initialReferrer(config);
    previousUrl = url;
    previousHref = normalizeUmamiHref(config, currentHref);

    const payload = buildUmamiPayload(
      config,
      {
        url,
        referrer,
        hostname: location.hostname,
        language: navigator.language,
        screen: `${screen.width}x${screen.height}`,
        title: document.title,
      },
      extra
    );

    fetch(config.endpoint, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(cacheToken ? { 'x-umami-cache': cacheToken } : {}),
      },
      body: JSON.stringify({ type: 'event', payload }),
    })
      .then((res) => res.json())
      .then((json: { cache?: string }) => {
        if (json?.cache) cacheToken = json.cache;
      })
      .catch(() => {
        // Fire-and-forget, same as Umami's own script - a dropped beacon isn't worth surfacing.
      });
  }

  return {
    pageview: (): void => send(),
    event: (name: string, data?: Record<string, string>): void => send({ name, data }),
  };
}
