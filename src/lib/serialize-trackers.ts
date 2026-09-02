import type { TrackerAdapter, UmamiApiTrackerAdapter } from './types.ts';

/**
 * The shape ConsentGate.astro writes into `#oia-config` and client.ts reads back via
 * JSON.parse - kept as one shared type + one shared function so the two ends of that
 * JSON boundary can't drift apart silently (they did once: ConsentGate serialized a flat
 * umami-api object while client.ts expected it nested under `config`).
 */
export type SerializedTracker =
  | { kind: 'script'; attrs: Record<string, string> & { src: string } }
  | { kind: 'umami-api'; config: Omit<UmamiApiTrackerAdapter, 'privacyInfo' | 'kind'> };

export function serializeTrackers(trackers: TrackerAdapter[]): SerializedTracker[] {
  return trackers.map((t) =>
    t.kind === 'umami-api'
      ? {
          kind: 'umami-api' as const,
          config: {
            endpoint: t.endpoint,
            websiteId: t.websiteId,
            domains: t.domains,
            excludeSearch: t.excludeSearch,
            excludeHash: t.excludeHash,
            respectDoNotTrack: t.respectDoNotTrack,
          },
        }
      : { kind: 'script' as const, attrs: t.scriptAttributes }
  );
}
