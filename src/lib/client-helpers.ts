/**
 * Pure pieces of `client.ts`, kept here so tests can import them under Node
 * without loading the browser-only module. Not in this package's `exports`
 * map - an implementation detail of `client.ts`, like `pending-action.ts`.
 */

export type ConsentState = 'gpc' | 'granted' | 'denied' | 'undecided';

/**
 * Merely reading `window.localStorage` throws a SecurityError in some
 * cookie/site-data-blocked browsers and sandboxed iframes - before any of
 * `Storage`'s own methods are called. `readConsent`/`writeConsent` already
 * swallow throws from `getItem`/`setItem`, but that protection never runs if
 * the caller's own `localStorage` reference throws first. Returns null in
 * that case, treated as "no persistence, decision applies for this page view
 * only" - the behaviour `writeConsent`'s own catch comment already promises.
 */
export function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Pure decision extracted from trackEvent() so it's testable without a DOM. */
export function shouldTrack(state: ConsentState, hasUmami: boolean): boolean {
  return state === 'granted' && hasUmami;
}

/**
 * Builds the affiliate-click payload from an <AffiliateLink>'s data attributes (see
 * @vdaluz/astro-affiliate). Returns null when key/program are missing - not a valid
 * affiliate link, skip tracking rather than send a partial event. `channel` defaults
 * to 'default' so Umami's per-channel breakdown is populated even for links that
 * don't pass one.
 */
export function buildAffiliateClickPayload(attrs: {
  key?: string | null;
  channel?: string | null;
  program?: string | null;
}): Record<string, string> | null {
  if (!attrs.key || !attrs.program) return null;
  return { key: attrs.key, channel: attrs.channel ?? 'default', program: attrs.program };
}
