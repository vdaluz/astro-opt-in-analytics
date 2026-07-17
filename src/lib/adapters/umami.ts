import type { TrackerAdapter, TrackerPrivacyInfo } from '../types';

export interface UmamiOptions {
  /** Full URL of the Umami tracker script, e.g. https://umami.example.net/script.js */
  src: string;
  websiteId: string;
  /** Extra data attributes passed through to the script tag, e.g. { 'data-exclude-search': 'true' }. */
  extra?: Record<string, string>;
  /** Override the default PrivacyExplainer info (self-hosted Umami, umami.is/privacy). */
  privacyInfo?: TrackerPrivacyInfo;
}

export function umami({ src, websiteId, extra = {}, privacyInfo }: UmamiOptions): TrackerAdapter {
  return {
    scriptAttributes: {
      src,
      'data-website-id': websiteId,
      'data-do-not-track': 'true',
      ...extra,
    },
    privacyInfo: privacyInfo ?? {
      label: 'A self-hosted analytics server',
      toolName: 'Umami',
      learnMoreUrl: 'https://umami.is/privacy',
    },
  };
}
