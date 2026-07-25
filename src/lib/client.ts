import { gpcDenied, readConsent, writeConsent } from './consent';
import type { ConsentDecision } from './types';

type ConsentState = 'gpc' | 'granted' | 'denied' | 'undecided';

interface GateConfig {
  attrs: Array<Record<string, string> & { src: string }>;
  version: number;
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

function injectTrackers(attrs: GateConfig['attrs']): void {
  attrs.forEach((trackerAttrs, index) => {
    const id = `${TRACKER_ELEMENT_ID}-${index}`;
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    for (const [name, value] of Object.entries(trackerAttrs)) {
      if (name === 'src') script.src = value;
      else script.setAttribute(name, value);
    }
    document.head.appendChild(script);
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
    // never track while the signal is present.
    setState('gpc');
    return;
  }

  const stored = readConsent(localStorage, config.version);
  setState(stored ?? 'undecided');
  if (stored === 'granted') injectTrackers(config.attrs);

  if (gateChooseListenerBound) return;
  gateChooseListenerBound = true;
  document.addEventListener(CHOOSE_EVENT, (event) => {
    const decision = (event as CustomEvent<ConsentDecision>).detail;
    if (decision !== 'granted' && decision !== 'denied') return;
    writeConsent(localStorage, config.version, decision, new Date().toISOString());
    setState(decision);
    if (decision === 'granted') injectTrackers(config.attrs);
    // A denial after the tracker already loaded applies from the next
    // navigation; nothing new is injected and the stored record now says no.
  });
}

/** Programmatically reopen the consent prompt (e.g. from a footer "Analytics preferences" link). */
export function openConsentPrompt(): void {
  document.dispatchEvent(new CustomEvent(OPEN_PROMPT_EVENT));
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
  }
}
