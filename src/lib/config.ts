import { DEFAULT_CONSENT_MAX_AGE_DAYS, DEFAULT_CONSENT_VERSION } from './consent.ts';
import type { AnalyticsConfig, ResolvedAnalyticsConfig } from './types.ts';

/** Idempotent, so the components can call it on a config that already went through it. */
export function resolveAnalyticsConfig(config: AnalyticsConfig): ResolvedAnalyticsConfig {
  return {
    ...config,
    tracker: Array.isArray(config.tracker) ? config.tracker : [config.tracker],
    consentVersion: config.consentVersion ?? DEFAULT_CONSENT_VERSION,
    consentMaxAgeDays: config.consentMaxAgeDays ?? DEFAULT_CONSENT_MAX_AGE_DAYS,
  };
}

export function defineAnalyticsConfig(config: AnalyticsConfig): ResolvedAnalyticsConfig {
  return resolveAnalyticsConfig(config);
}
