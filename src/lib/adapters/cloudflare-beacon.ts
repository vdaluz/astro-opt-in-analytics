import type { TrackerAdapter, TrackerPrivacyInfo } from '../types';

export interface CloudflareBeaconOptions {
  /** Cloudflare Web Analytics site token, from the dashboard's JS snippet. */
  token: string;
  /** Extra data attributes passed through to the script tag. */
  extra?: Record<string, string>;
  /** Override the default PrivacyExplainer info (Cloudflare Web Analytics). */
  privacyInfo?: TrackerPrivacyInfo;
}

export function cloudflareBeacon({
  token,
  extra = {},
  privacyInfo,
}: CloudflareBeaconOptions): TrackerAdapter {
  return {
    scriptAttributes: {
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      'data-cf-beacon': JSON.stringify({ token }),
      ...extra,
    },
    privacyInfo: privacyInfo ?? {
      label: "Cloudflare's Web Analytics",
      toolName: 'Cloudflare Web Analytics',
      learnMoreUrl: 'https://www.cloudflare.com/web-analytics/',
    },
  };
}
