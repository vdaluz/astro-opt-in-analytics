import type { AnalyticsConfig } from './types';

export function defineAnalyticsConfig(config: AnalyticsConfig): AnalyticsConfig {
  return { consentVersion: 1, consentMaxAgeDays: 365, ...config };
}
