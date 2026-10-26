// Minute ticker: sends every digest that is due, one user at a time, and schedules the next one.
import { runDigest } from './digest.js';
import { nextRunAt } from './schedule.js';

const MAX_LATENESS_MS = 6 * 60 * 60 * 1000; // after downtime, skip digests more than 6h late

/** One pass. Exported for tests. Returns { userId: outcome } for the digests it handled. */
export async function tick(deps, now = Date.now()) {
  const outcomes = {};
  for (const [userId, record] of await deps.tokens.store.entries()) {
    const d = record.digest;
    if (!d?.enabled || !d.nextRunAt || d.nextRunAt > now) continue;

    const late = now - d.nextRunAt > MAX_LATENESS_MS;
    outcomes[userId] = late ? 'skipped_late' : await runDigest(deps, userId);

    // Always move the schedule forward (re-read: runDigest may have paused it or added sent ids).
    const latest = (await deps.tokens.store.get(userId))?.digest;
    if (latest) {
      await deps.tokens.store.update(userId, { digest: { ...latest, nextRunAt: nextRunAt(latest, now) } });
    }
  }
  return outcomes;
}

export function startScheduler(deps, { intervalMs = 60_000 } = {}) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return; // never overlap passes
    running = true;
    try {
      const outcomes = await tick(deps);
      const n = Object.keys(outcomes).length;
      if (n) console.log(`[scheduler] ${n} digest(s):`, outcomes);
    } catch (err) {
      console.error('[scheduler]', err);
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
