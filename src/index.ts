export { defineAnalyticsConfig } from './lib/config';
export { umami } from './lib/adapters/umami';
export type { UmamiOptions } from './lib/adapters/umami';
export { cloudflareBeacon } from './lib/adapters/cloudflare-beacon';
export type { CloudflareBeaconOptions } from './lib/adapters/cloudflare-beacon';
export { CONSENT_STORAGE_KEY, readConsent, writeConsent, gpcDenied } from './lib/consent';
export type {
  AnalyticsConfig,
  ConsentDecision,
  ConsentRecord,
  PromptCopy,
  ScriptTrackerAdapter,
  TrackerAdapter,
  TrackerPrivacyInfo,
  UmamiApiTrackerAdapter,
} from './lib/types';
export type { PrivacyExplainerStrings } from './lib/privacy-explainer-strings';
