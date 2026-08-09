import type { TrackerPrivacyInfo, UmamiApiTrackerAdapter } from '../types';

export interface UmamiOptions {
  /** Full URL of the Umami tracker script, e.g. https://umami.example.net/script.js. The API
   * endpoint (.../api/send) is derived from this by stripping the filename. */
  src: string;
  websiteId: string;
  /** Only send when the current hostname is in this list. Omit to track on any hostname. */
  domains?: string[];
  /** Strip the query string from the tracked URL before sending. */
  excludeSearch?: boolean;
  /** Strip the hash from the tracked URL before sending. */
  excludeHash?: boolean;
  /** Suppress sending when the browser reports Do Not Track. Default true. */
  respectDoNotTrack?: boolean;
  /** Override the default PrivacyExplainer info (self-hosted Umami, umami.is/privacy). */
  privacyInfo?: TrackerPrivacyInfo;
}

export function umamiApiEndpoint(scriptSrc: string): string {
  return `${scriptSrc.replace(/\/[^/]*$/, '')}/api/send`;
}

export function umami({
  src,
  websiteId,
  domains,
  excludeSearch,
  excludeHash,
  respectDoNotTrack = true,
  privacyInfo,
}: UmamiOptions): UmamiApiTrackerAdapter {
  return {
    kind: 'umami-api',
    endpoint: umamiApiEndpoint(src),
    websiteId,
    domains,
    excludeSearch,
    excludeHash,
    respectDoNotTrack,
    privacyInfo: privacyInfo ?? {
      label: 'A self-hosted analytics server',
      toolName: 'Umami',
      learnMoreUrl: 'https://umami.is/privacy',
    },
  };
}
