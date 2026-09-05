/**
 * Tracks at most one outstanding cleanup callback so callers never have to
 * remember to null out a stale reference by hand. `set()` supersedes (and
 * invokes) whatever was previously pending before storing the new one;
 * `cancel()` invokes the pending callback, if any, and clears it. Not in
 * this package's `exports` map - it's an implementation detail of
 * `client.ts`, importable by tests via relative path but not by consumers.
 */
export function createPendingAction(): { set(fn: () => void): void; cancel(): void } {
  let action: (() => void) | null = null;
  return {
    set(fn: () => void): void {
      action?.();
      action = fn;
    },
    cancel(): void {
      action?.();
      action = null;
    },
  };
}
