import type { TrackerAdapter } from '../types';

export interface UmamiOptions {
  /** Full URL of the Umami tracker script, e.g. https://umami.example.net/script.js */
  src: string;
  websiteId: string;
  /** Extra data attributes passed through to the script tag, e.g. { 'data-exclude-search': 'true' }. */
  extra?: Record<string, string>;
}

export function umami({ src, websiteId, extra = {} }: UmamiOptions): TrackerAdapter {
  return {
    scriptAttributes: {
      src,
      'data-website-id': websiteId,
      'data-do-not-track': 'true',
      ...extra,
    },
  };
}
