import type { Localized } from './i18n';

export interface TrackerAdapter {
  /** Attributes for the injected script tag. `src` is required; everything else is passed through. */
  scriptAttributes: Record<string, string> & { src: string };
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
