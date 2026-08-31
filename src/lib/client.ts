import { gpcDenied, readConsent, writeConsent } from './consent.ts';
import { createUmamiSender, type UmamiSender } from './umami-api.ts';
import type { SerializedTracker } from './serialize-trackers.ts';
import type { ConsentDecision } from './types';

type ConsentState = 'gpc' | 'granted' | 'denied' | 'undecided';

interface GateConfig {
  trackers: SerializedTracker[];
  version: number;
  maxAgeDays: number;
}

const CONFIG_ELEMENT_ID = 'oia-config';
const TRACKER_ELEMENT_ID = 'oia-tracker';
const PROMPT_ELEMENT_ID = 'oia-prompt';

const CHOOSE_EVENT = 'oia:choose';
const OPEN_PROMPT_EVENT = 'oia:open-prompt';
const STATE_ATTRIBUTE = 'data-oia-state';
const MOBILE_QUERY = '(max-width: 640px)';
const MOBILE_DEFER_MS = 3000;

function getState(): ConsentState {
  return (document.documentElement.getAttribute(STATE_ATTRIBUTE) as ConsentState) ?? 'undecided';
}

function setState(state: ConsentState): void {
  document.documentElement.setAttribute(STATE_ATTRIBUTE, state);
}

function readGateConfig(): GateConfig | null {
  const el = document.getElementById(CONFIG_ELEMENT_ID);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as GateConfig;
  } catch {
    return null;
  }
}

function injectScriptTracker(attrs: Record<string, string> & { src: string }, id: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'src') script.src = value;
    else script.setAttribute(name, value);
  }
  document.head.appendChild(script);
}

/** One sender per umami-api tracker, reused across astro:page-load re-runs so its
 * session-cache token and previous-URL/referrer state survive soft navigations. */
const umamiSenders = new Map<string, UmamiSender>();

function activateTrackers(trackers: SerializedTracker[]): void {
  trackers.forEach((tracker, index) => {
    if (tracker.kind === 'script') {
      injectScriptTracker(tracker.attrs, `${TRACKER_ELEMENT_ID}-${index}`);
      return;
    }
    const key = tracker.config.endpoint + tracker.config.websiteId;
    let sender = umamiSenders.get(key);
    if (!sender) {
      sender = createUmamiSender(tracker.config);
      umamiSenders.set(key, sender);
    }
    sender.pageview();
  });
}

let gateChooseListenerBound = false;

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

/**
 * Boot the consent gate. Re-run on every astro:page-load (see ConsentGate.astro) so a
 * ClientRouter navigation re-stamps state and re-injects the tracker for the new page;
 * a document-level CHOOSE_EVENT listener only needs binding once since `document` itself
 * persists across soft navigations.
 */
export function bootConsentGate(): void {
  const config = readGateConfig();
  if (!config) return;

  if (gpcDenied(navigator as Navigator & { globalPrivacyControl?: boolean })) {
    // The browser already answered for the user. Never prompt, never persist,
    // never track while the signal is present - including never binding the
    // affiliate-click listener below.
    setState('gpc');
    return;
  }

  bindAffiliateClickTracking();

  const storage = safeStorage();
  const stored = storage ? readConsent(storage, config.version, config.maxAgeDays) : null;
  setState(stored ?? 'undecided');
  if (stored === 'granted') activateTrackers(config.trackers);

  if (gateChooseListenerBound) return;
  gateChooseListenerBound = true;
  document.addEventListener(CHOOSE_EVENT, (event) => {
    const decision = (event as CustomEvent<ConsentDecision>).detail;
    if (decision !== 'granted' && decision !== 'denied') return;
    if (storage) writeConsent(storage, config.version, decision, new Date().toISOString());
    setState(decision);
    if (decision === 'granted') activateTrackers(config.trackers);
    // A denial after the tracker already loaded applies from the next
    // navigation; nothing new is injected and the stored record now says no.
  });
}

/** Pure decision extracted from trackEvent() so it's testable without a DOM. */
export function shouldTrack(state: ConsentState, hasUmami: boolean): boolean {
  return state === 'granted' && hasUmami;
}

/**
 * Reports a custom event to every active Umami tracker if consent is currently granted,
 * no-ops otherwise (denied, undecided, GPC, or no Umami tracker on this page - e.g.
 * Cloudflare Beacon only, which has no custom-event API). Consent is checked live via
 * getState(), so a decision made after this module loaded is picked up correctly.
 */
export function trackEvent(name: string, data?: Record<string, string>): void {
  if (!shouldTrack(getState(), umamiSenders.size > 0)) return;
  umamiSenders.forEach((sender) => sender.event(name, data));
}

const AFFILIATE_KEY_ATTR = 'data-affiliate-key';
const AFFILIATE_CHANNEL_ATTR = 'data-affiliate-channel';
const AFFILIATE_PROGRAM_ATTR = 'data-affiliate-program';
const AFFILIATE_CLICK_EVENT = 'affiliate-click';

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

let affiliateClickListenerBound = false;

/**
 * Delegated click listener for any `[data-affiliate-key]` anchor on the page, same
 * pattern as the `[data-open-analytics-prompt]` listener below. Bound once from
 * bootConsentGate() - harmless on pages with no affiliate links, and consent is
 * re-checked live by trackEvent() at click time, so binding here doesn't itself track
 * anything.
 */
function bindAffiliateClickTracking(): void {
  if (affiliateClickListenerBound) return;
  affiliateClickListenerBound = true;
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest(`[${AFFILIATE_KEY_ATTR}]`) as HTMLElement | null;
    if (!link) return;
    const payload = buildAffiliateClickPayload({
      key: link.getAttribute(AFFILIATE_KEY_ATTR),
      channel: link.getAttribute(AFFILIATE_CHANNEL_ATTR),
      program: link.getAttribute(AFFILIATE_PROGRAM_ATTR),
    });
    if (payload) trackEvent(AFFILIATE_CLICK_EVENT, payload);
  });
}

/** Programmatically reopen the consent prompt (e.g. from a footer "Analytics preferences" link). */
export function openConsentPrompt(): void {
  document.dispatchEvent(new CustomEvent(OPEN_PROMPT_EVENT));
}

/**
 * 'bar' placement is a full-width fixed bar at the bottom of the viewport, which the
 * browser's default scroll-into-view does not account for - tabbing to an in-article
 * or footer link that lands in that band would otherwise focus a hidden element (SC
 * 2.4.11). Reserve that space via scroll-padding-bottom while the bar is visible;
 * clear it once answered so the page reclaims the full scroll range. No-op for
 * 'corner' placement, which never covers enough of the viewport to need this.
 */
function applyBarScrollPadding(prompt: HTMLElement, visible: boolean): void {
  if (prompt.dataset.placement !== 'bar') return;
  const root = document.documentElement;
  if (!visible) {
    root.style.scrollPaddingBottom = '';
    return;
  }
  requestAnimationFrame(() => {
    root.style.scrollPaddingBottom = `${prompt.getBoundingClientRect().height}px`;
  });
}

let promptDocumentListenersBound = false;
let pendingMobileReveal: (() => void) | null = null;

function scheduleMobileReveal(prompt: HTMLElement): void {
  // A soft navigation can happen mid-countdown from a previous page; clear that
  // pending timer/listener before scheduling a fresh one for the new element.
  pendingMobileReveal?.();

  let revealed = false;
  const reveal = (): void => {
    if (revealed) return;
    revealed = true;
    window.removeEventListener('scroll', reveal);
    clearTimeout(timer);
    pendingMobileReveal = null;
    prompt.hidden = false;
    applyBarScrollPadding(prompt, true);
  };
  window.addEventListener('scroll', reveal, { once: true, passive: true });
  const timer = window.setTimeout(reveal, MOBILE_DEFER_MS);
  pendingMobileReveal = (): void => {
    window.removeEventListener('scroll', reveal);
    clearTimeout(timer);
  };
}

/**
 * Boot the consent prompt. Shows itself only when the visitor has not decided
 * and no privacy signal already answered. Reopens on request, in either state.
 *
 * Re-run on every astro:page-load (see ConsentPrompt.astro): a ClientRouter
 * navigation swaps in a fresh #oia-prompt element with no listeners, so the
 * element-scoped bindings below must rebind every time. The document-level
 * listeners only need binding once since `document` persists across soft nav -
 * OPEN_PROMPT_EVENT's handler re-queries the prompt fresh at fire-time instead
 * of closing over this run's element, so it stays correct across navigations
 * without needing to be re-registered.
 */
export function bootConsentPrompt(): void {
  const prompt = document.getElementById(PROMPT_ELEMENT_ID);
  if (!prompt) return;

  const choose = (decision: ConsentDecision): void => {
    document.dispatchEvent(new CustomEvent(CHOOSE_EVENT, { detail: decision }));
    prompt.hidden = true;
    applyBarScrollPadding(prompt, false);
  };

  prompt.querySelector('[data-oia-accept]')?.addEventListener('click', () => choose('granted'));
  prompt.querySelector('[data-oia-decline]')?.addEventListener('click', () => choose('denied'));

  prompt.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape') choose('denied');
  });

  if (!promptDocumentListenersBound) {
    promptDocumentListenersBound = true;

    document.addEventListener(OPEN_PROMPT_EVENT, () => {
      const current = document.getElementById(PROMPT_ELEMENT_ID);
      if (!current || getState() === 'gpc') return;
      current.hidden = false;
      applyBarScrollPadding(current, true);
      (current.querySelector('[data-oia-decline]') as HTMLElement | null)?.focus();
    });

    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-open-analytics-prompt]')) openConsentPrompt();
    });
  }

  if (getState() !== 'undecided') return;

  // On phone widths the prompt renders as a full-width bottom sheet tall
  // enough to cover the hero on first paint. Deferring its first reveal
  // until the visitor scrolls (or a short idle timeout, for pages short
  // enough to never need scrolling) gives that first paint a clean look
  // without weakening any of the "no dark pattern" guarantees below - the
  // prompt still auto-reveals immediately everywhere else.
  if (window.matchMedia(MOBILE_QUERY).matches) {
    scheduleMobileReveal(prompt);
  } else {
    prompt.hidden = false;
    applyBarScrollPadding(prompt, true);
  }
}
