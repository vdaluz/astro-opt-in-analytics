import type { ConsentDecision, ConsentRecord } from './types';

export const CONSENT_STORAGE_KEY = 'opt-in-analytics:consent';

// Storage and navigator are parameters, not globals, so this module is testable
// outside a browser and never touches window at import time (SSR-safe).

export function readConsent(
  storage: Pick<Storage, 'getItem'>,
  version: number
): ConsentDecision | null {
  try {
    const raw = storage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as Partial<ConsentRecord>;
    if (record.v !== version) return null;
    return record.decision === 'granted' || record.decision === 'denied'
      ? record.decision
      : null;
  } catch {
    return null;
  }
}

export function writeConsent(
  storage: Pick<Storage, 'setItem'>,
  version: number,
  decision: ConsentDecision,
  at: string
): void {
  try {
    const record: ConsentRecord = { v: version, decision, at };
    storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable (private mode quota, disabled). The decision still
    // applies for this page view; the visitor is asked again next time.
  }
}

export function gpcDenied(nav: { globalPrivacyControl?: boolean }): boolean {
  return nav.globalPrivacyControl === true;
}
