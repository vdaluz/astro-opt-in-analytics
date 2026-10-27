import type { Localized } from '../i18n.ts';
import type { TrackerAdapter, TrackerPrivacyInfo } from '../types.ts';

export interface CloudflareBeaconOptions {
  /** Cloudflare Web Analytics site token, from the dashboard's JS snippet. */
  token: string;
  /** Extra data attributes passed through to the script tag. */
  extra?: Record<string, string>;
  /**
   * Overrides the default PrivacyExplainer info (Cloudflare Web Analytics). Merged over the
   * defaults, so overriding `label` or `description` keeps the default `collects` list.
   */
  privacyInfo?: Partial<TrackerPrivacyInfo>;
}

// Per Cloudflare's Web Analytics docs (data-metrics: data-origin-and-collection,
// core-web-vitals, dimensions). Path and referrer are already in PrivacyExplainer's baseline.
export const CLOUDFLARE_BEACON_COLLECTS: Localized[] = [
  {
    default: 'page load and paint timings',
    es: 'los tiempos de carga y renderizado de la página',
    pt: 'os tempos de carregamento e renderização da página',
  },
  {
    default: 'Core Web Vitals (with the page element each one measured)',
    es: 'las Core Web Vitals (con el elemento de la página que mide cada una)',
    pt: 'as Core Web Vitals (com o elemento da página que cada uma mede)',
  },
  { default: 'your country', es: 'tu país', pt: 'seu país' },
  {
    default: 'your browser, operating system and device type',
    es: 'tu navegador, sistema operativo y tipo de dispositivo',
    pt: 'seu navegador, sistema operacional e tipo de dispositivo',
  },
];

const DEFAULT_PRIVACY_INFO: TrackerPrivacyInfo = {
  label: "Cloudflare's Web Analytics",
  toolName: 'Cloudflare Web Analytics',
  learnMoreUrl: 'https://www.cloudflare.com/web-analytics/',
  collects: CLOUDFLARE_BEACON_COLLECTS,
};

export function cloudflareBeacon({
  token,
  extra = {},
  privacyInfo,
}: CloudflareBeaconOptions): TrackerAdapter {
  return {
    scriptAttributes: {
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      type: 'module',
      'data-cf-beacon': JSON.stringify({ token }),
      ...extra,
    },
    privacyInfo: { ...DEFAULT_PRIVACY_INFO, ...privacyInfo },
  };
}
