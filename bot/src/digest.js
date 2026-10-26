// Builds and delivers one user's digest. Each digest costs exactly ONE daily.dev request, made with
// that user's own token, and is delivered only to that user by DM.
import { DailyDevError } from './dailydev.js';
import { buildDigestEmbed } from './format.js';
import { t } from './i18n.js';
import { NotConnectedError } from './tokenManager.js';

export const MAX_REMEMBERED = 300; // post ids already sent, to avoid repeats across digests
const DM_FAILURES_BEFORE_PAUSE = 3;

/** Fetches a little more than needed and drops posts already sent before. */
export async function buildDigest(tokens, userId, digest) {
  const sent = new Set(digest.sentIds ?? []);
  const fetchLimit = Math.min(Math.max(digest.count * 2, 10), 30);
  const posts = await tokens.withClient(userId, (client) => client.getFeed(digest, fetchLimit));
  return posts.filter((p) => p?.id && p.title && !sent.has(p.id)).slice(0, digest.count);
}

/**
 * @param {{ tokens, sendDm: (userId: string, payload: object) => Promise<void> }} deps
 * @returns {Promise<'sent' | 'empty' | 'dm_failed' | 'paused' | 'not_connected' | 'rate_limited' | 'error'>}
 */
export const DEFAULT_DIGEST = { source: 'foryou', count: 5, sentIds: [] };

export async function runDigest(deps, userId, { preview = false } = {}) {
  const { tokens, sendDm } = deps;
  const record = await tokens.store.get(userId);
  if (!record) return 'not_connected';
  // A preview works even before the digest is configured.
  const digest = record.digest ?? (preview ? DEFAULT_DIGEST : null);
  if (!digest) return 'not_connected';
  const s = t(record.locale);

  let posts;
  try {
    posts = await buildDigest(tokens, userId, digest);
  } catch (err) {
    if (err instanceof NotConnectedError) return 'not_connected';
    if (err instanceof DailyDevError && err.status === 429) return 'rate_limited';
    console.error('[digest build]', userId, err.message);
    return 'error';
  }
  if (!posts.length && !preview) return 'empty'; // nothing new: stay quiet rather than send an empty DM

  try {
    await sendDm(userId, { embeds: [buildDigestEmbed({ posts, digest, strings: s, preview })] });
  } catch (err) {
    const failures = (digest.dmFailures ?? 0) + 1;
    const pause = failures >= DM_FAILURES_BEFORE_PAUSE;
    await tokens.store.update(userId, {
      digest: { ...digest, dmFailures: failures, ...(pause ? { enabled: false, pausedReason: 'dm_closed' } : {}) },
    });
    console.warn('[digest dm]', userId, err.code ?? err.message);
    return pause ? 'paused' : 'dm_failed';
  }

  if (!preview) {
    const latest = (await tokens.store.get(userId))?.digest ?? digest;
    const sentIds = [...posts.map((p) => p.id), ...(latest.sentIds ?? [])].slice(0, MAX_REMEMBERED);
    await tokens.store.update(userId, { digest: { ...latest, sentIds, dmFailures: 0, lastSentAt: new Date().toISOString() } });
  }
  return 'sent';
}
