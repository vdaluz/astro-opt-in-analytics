import { gpcDenied, readConsent, writeConsent } from './consent.ts';
import { createUmamiSender, type UmamiSender } from './umami-api.ts';
import { createPendingAction } from './pending-action.ts';
import type { SerializedTracker } from './serialize-trackers.ts';
import type { ConsentDecision } from './types.ts';
import {
  buildAffiliateClickPayload,
  safeStorage,
  shouldTrack,
  type ConsentState,
} from './client-helpers.ts';

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
 * The prompt is fixed to the bottom of the viewport in every placement ('bar' full-
 * width, 'corner' bottom-right, the <=640px mobile sheet), which the browser's default
 * scroll-into-view does not account for - tabbing to an in-article or footer link that
 * lands behind it would otherwise focus a hidden element (SC 2.4.11). Reserve that
 * space while the prompt is visible and clear it once answered. scroll-padding-bottom
 * alone only moves the scroll-into-view target; content at the very end of the page
 * (footer links) has no scroll range left to move into, so padding-bottom adds that
 * range.
 *
 * Height alone under-reserves for 'corner': it sits inset-block-end: 1rem, not flush
 * with the viewport edge like 'bar', so its occluded band starts 1rem higher than its
 * height alone would suggest. Add the computed inset-block-end to cover that gap - 0
 * for 'bar' and the mobile sheet, so this is a no-op change for both.
 *
 * Read inset-block-end via getComputedStyle rather than deriving it from the rect,
 * because the entrance animation (@starting-style + translateY) can still be mid-
 * transition when this runs in a requestAnimationFrame - getBoundingClientRect()
 * includes the transform, so a rect-derived measurement taken then would under-
 * reserve permanently. The computed inset-block-end isn't affected by the transform.
 */
function reservePromptSpace(prompt: HTMLElement): void {
  requestAnimationFrame(() => {
    const height = prompt.getBoundingClientRect().height;
    const inset = parseFloat(getComputedStyle(prompt).insetBlockEnd) || 0;
    const root = document.documentElement;
    root.style.scrollPaddingBottom = `${height + inset}px`;
    root.style.paddingBottom = `${height + inset}px`;
  });
}

function releasePromptSpace(): void {
  const root = document.documentElement;
  root.style.scrollPaddingBottom = '';
  root.style.paddingBottom = '';
}

let promptDocumentListenersBound = false;
// A soft navigation can happen mid-countdown from a previous page's prompt, or a
// decision can arrive before the countdown finishes on this one; `set()`/`cancel()`
// keep at most one reveal pending and self-null so no call site here has to remember to.
const pendingMobileReveal = createPendingAction();

function scheduleMobileReveal(prompt: HTMLElement): void {
  let revealed = false;
  const reveal = (): void => {
    if (revealed) return;
    revealed = true;
    pendingMobileReveal.cancel();
    prompt.hidden = false;
    reservePromptSpace(prompt);
  };
  window.addEventListener('scroll', reveal, { once: true, passive: true });
  const timer = window.setTimeout(reveal, MOBILE_DEFER_MS);
  pendingMobileReveal.set(() => {
    window.removeEventListener('scroll', reveal);
    clearTimeout(timer);
  });
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
  if (!prompt) {
    // A ClientRouter navigation to a page with no prompt: the previous page's reveal
    // timer/scroll-listener, if still pending, would otherwise fire later against the
    // now-detached old element and re-apply scroll padding on this page.
    releasePromptSpace();
    pendingMobileReveal.cancel();
    return;
  }

  const choose = (decision: ConsentDecision): void => {
    document.dispatchEvent(new CustomEvent(CHOOSE_EVENT, { detail: decision }));
    prompt.hidden = true;
    releasePromptSpace();
    pendingMobileReveal.cancel();
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
      reservePromptSpace(current);
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
    reservePromptSpace(prompt);
  }
}
