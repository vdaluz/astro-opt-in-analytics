export { defineAnalyticsConfig } from './lib/config.ts';
export { umami } from './lib/adapters/umami.ts';
export type { UmamiOptions } from './lib/adapters/umami.ts';
export { cloudflareBeacon } from './lib/adapters/cloudflare-beacon.ts';
export type { CloudflareBeaconOptions } from './lib/adapters/cloudflare-beacon.ts';
export { CONSENT_STORAGE_KEY, readConsent, writeConsent, gpcDenied } from './lib/consent.ts';
export type {
  AnalyticsConfig,
  ConsentDecision,
  ConsentRecord,
  PromptCopy,
  ScriptTrackerAdapter,
  TrackerAdapter,
  TrackerPrivacyInfo,
  UmamiApiTrackerAdapter,
} from './lib/types.ts';
export type { PrivacyExplainerStrings } from './lib/privacy-explainer-strings.ts';
