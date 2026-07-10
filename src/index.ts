export { defineAnalyticsConfig } from './lib/config';
export { umami } from './lib/adapters/umami';
export type { UmamiOptions } from './lib/adapters/umami';
export { CONSENT_STORAGE_KEY, readConsent, writeConsent, gpcDenied } from './lib/consent';
export type {
  AnalyticsConfig,
  ConsentDecision,
  ConsentRecord,
  PromptCopy,
  TrackerAdapter,
} from './lib/types';
