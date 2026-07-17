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
}

export interface TrackerAdapter {
  /** Attributes for the injected script tag. `src` is required; everything else is passed through. */
  scriptAttributes: Record<string, string> & { src: string };
  /** Optional info for PrivacyExplainer. Omit for internal/undocumented trackers. */
  privacyInfo?: TrackerPrivacyInfo;
}

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
}

export type ConsentDecision = 'granted' | 'denied';

export interface ConsentRecord {
  v: number;
  decision: ConsentDecision;
  at: string;
}
