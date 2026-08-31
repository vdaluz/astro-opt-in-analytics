import type { Localized } from './i18n';

export interface TrackerPrivacyInfo {
  /** Short description of what this tracker is, e.g. "A self-hosted analytics server". */
  label: Localized;
  /** Name of the underlying tool, e.g. "Umami". */
  toolName: string;
  /** URL to the tool's own privacy policy or product page. */
  learnMoreUrl: string;
  /** Optional trailing clause describing this specific deployment, e.g. "that I run myself, on my own infrastructure." */
  description?: Localized;
  /** Additional data points this specific tracker collects, rendered as a trailing
   * clause in PrivacyExplainer's "tools behind it" list for this tool. */
  collects?: Localized[];
}

/** A tracker whose init/tracking happens by injecting a `<script>` tag (e.g. Cloudflare Beacon). */
export interface ScriptTrackerAdapter {
  kind?: 'script';
  /** Attributes for the injected script tag. `src` is required; everything else is passed through. */
  scriptAttributes: Record<string, string> & { src: string };
  /** Optional info for PrivacyExplainer. Omit for internal/undocumented trackers. */
  privacyInfo?: TrackerPrivacyInfo;
}

/**
 * A tracker that reports directly to Umami's /api/send instead of loading the official
 * tracker script. Umami's script gates its own init on `document.currentScript`, which is
 * null for a script this package injects dynamically after consent - the script silently
 * never initializes. Posting to the documented API endpoint sidesteps that entirely.
 */
export interface UmamiApiTrackerAdapter {
  kind: 'umami-api';
  /** e.g. https://umami.example.net/api/send, derived from the configured script src. */
  endpoint: string;
  websiteId: string;
  /** Only send when the current hostname is in this list. Omit to track on any hostname. */
  domains?: string[];
  excludeSearch?: boolean;
  excludeHash?: boolean;
  /** Suppress sending when the browser reports Do Not Track. Default true. */
  respectDoNotTrack?: boolean;
  privacyInfo?: TrackerPrivacyInfo;
}

export type TrackerAdapter = ScriptTrackerAdapter | UmamiApiTrackerAdapter;

export interface PromptCopy {
  message: Localized;
  accept: Localized;
  decline: Localized;
  /** Accessible name for the dialog. Defaults to "Analytics consent". */
  label?: Localized;
}

export interface AnalyticsConfig {
  /** One tracker or several; all are injected together on a stored grant. */
  tracker: TrackerAdapter | TrackerAdapter[];
  prompt: PromptCopy;
  /** Bump when what you track changes; stored decisions from older versions re-prompt. */
  consentVersion?: number;
  /**
   * Days after which a stored consent decision expires and re-prompts, matching
   * EU regulator guidance that consent has a shelf life (CNIL: 6 months typical,
   * EDPB/most DPAs: 12-13 months upper bound). Default 365. Set 0 or Infinity to
   * disable expiry entirely. Applies uniformly to both granted and denied
   * decisions - an old decline re-prompts too.
   */
  consentMaxAgeDays?: number;
}

export type ConsentDecision = 'granted' | 'denied';

export interface ConsentRecord {
  v: number;
  decision: ConsentDecision;
  at: string;
}
