export interface TrackerAdapter {
  /** Attributes for the injected script tag. `src` is required; everything else is passed through. */
  scriptAttributes: Record<string, string> & { src: string };
}

export interface PromptCopy {
  message: string;
  accept: string;
  decline: string;
  /** Accessible name for the dialog. Defaults to "Analytics consent". */
  label?: string;
}

export interface AnalyticsConfig {
  tracker: TrackerAdapter;
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
