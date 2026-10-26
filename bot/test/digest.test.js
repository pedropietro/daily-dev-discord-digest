import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_REMEMBERED, runDigest } from '../src/digest.js';
import { DailyDevError } from '../src/dailydev.js';
import { tick } from '../src/scheduler.js';
import { NotConnectedError } from '../src/tokenManager.js';

const post = (id) => ({ id, title: `Post ${id}`, url: `https://x.dev/${id}`, numUpvotes: 1 });

function setup({ records, feed = [], feedError, dmError } = {}) {
  const calls = { feed: [], dm: [] };
  const store = {
    data: structuredClone(records),
    get: async (id) => (store.data[id] ? structuredClone(store.data[id]) : null),
    set: async (id, r) => { store.data[id] = structuredClone(r); },
    update: async (id, patch) => { if (!store.data[id]) return null; store.data[id] = { ...store.data[id], ...structuredClone(patch) }; return store.data[id]; },
    entries: async () => Object.entries(structuredClone(store.data)),
  };
  const tokens = {
    store,
    withClient: async (id, fn) => fn({
      getFeed: async (d, limit) => {
        calls.feed.push([id, d.source, d.feedId ?? null, limit]);
        if (feedError) throw feedError;
        return feed;
      },
    }),
  };
  const sendDm = async (id, payload) => { if (dmError) throw dmError; calls.dm.push([id, payload]); };
  return { deps: { tokens, sendDm }, store, calls };
}

const digest = (extra = {}) => ({ enabled: true, source: 'foryou', count: 3, sentIds: [], hour: 8, minute: 0, days: 'daily', timeZone: 'UTC', ...extra });

test('one request with the user\'s own token, DM only to that user, already-sent posts skipped', async () => {
  const { deps, store, calls } = setup({
    records: { alice: { digest: digest({ sentIds: ['a'] }) }, bob: { digest: digest() } },
    feed: ['a', 'b', 'c', 'd', 'e'].map(post),
  });
  assert.equal(await runDigest(deps, 'alice'), 'sent');
  assert.deepEqual(calls.feed, [['alice', 'foryou', null, 10]]);
  assert.equal(calls.dm.length, 1);
  assert.equal(calls.dm[0][0], 'alice');
  assert.match(calls.dm[0][1].embeds[0].description, /Post b[\s\S]*Post c[\s\S]*Post d/);
  assert.doesNotMatch(calls.dm[0][1].embeds[0].description, /Post a\]/);
  assert.deepEqual(store.data.alice.digest.sentIds.slice(0, 4), ['b', 'c', 'd', 'a']);
});

test('nothing new → no DM (quiet), preview still sends', async () => {
  const { deps, calls } = setup({ records: { u: { digest: digest({ sentIds: ['a'] }) } }, feed: [post('a')] });
  assert.equal(await runDigest(deps, 'u'), 'empty');
  assert.equal(calls.dm.length, 0);
  assert.equal(await runDigest(deps, 'u', { preview: true }), 'sent');
  assert.match(calls.dm[0][1].embeds[0].description, /Nothing new/);
});

test('preview works before the digest is configured and does not mark posts as sent', async () => {
  const { deps, store, calls } = setup({ records: { u: { locale: 'pt-BR' } }, feed: [post('a')] });
  assert.equal(await runDigest(deps, 'u', { preview: true }), 'sent');
  assert.match(calls.dm[0][1].embeds[0].title, /Seu digest do daily\.dev · For You/);
  assert.equal(store.data.u.digest, undefined);
});

test('custom feed source passes the feed id', async () => {
  const { deps, calls } = setup({ records: { u: { digest: digest({ source: 'custom', feedId: 'F1', feedName: '⛓️ JavaBlockchain' }) } }, feed: [post('x')] });
  await runDigest(deps, 'u');
  assert.deepEqual(calls.feed[0], ['u', 'custom', 'F1', 10]);
  assert.match(calls.dm[0][1].embeds[0].title, /Custom feed: ⛓️ JavaBlockchain/);
});

test('DMs closed: counts failures and pauses after 3', async () => {
  const { deps, store } = setup({ records: { u: { digest: digest() } }, feed: [post('a')], dmError: Object.assign(new Error('Cannot send messages to this user'), { code: 50007 }) });
  assert.equal(await runDigest(deps, 'u'), 'dm_failed');
  assert.equal(await runDigest(deps, 'u'), 'dm_failed');
  assert.equal(await runDigest(deps, 'u'), 'paused');
  assert.equal(store.data.u.digest.enabled, false);
  assert.equal(store.data.u.digest.pausedReason, 'dm_closed');
});

test('quota and lost session are reported, nothing is sent', async () => {
  const q = setup({ records: { u: { digest: digest() } }, feedError: new DailyDevError('quota', 429) });
  assert.equal(await runDigest(q.deps, 'u'), 'rate_limited');
  const n = setup({ records: { u: { digest: digest() } }, feedError: new NotConnectedError() });
  assert.equal(await runDigest(n.deps, 'u'), 'not_connected');
  assert.equal(q.calls.dm.length + n.calls.dm.length, 0);
});

test('sent ids are capped', async () => {
  const many = Array.from({ length: MAX_REMEMBERED }, (_, i) => `old${i}`);
  const { deps, store } = setup({ records: { u: { digest: digest({ sentIds: many }) } }, feed: [post('new')] });
  await runDigest(deps, 'u');
  assert.equal(store.data.u.digest.sentIds.length, MAX_REMEMBERED);
  assert.equal(store.data.u.digest.sentIds[0], 'new');
});

test('scheduler: runs due digests, skips very late ones, always reschedules', async () => {
  const now = Date.parse('2026-10-26T11:00:30Z');
  const { deps, store, calls } = setup({
    records: {
      due: { digest: digest({ nextRunAt: now - 30_000 }) },
      late: { digest: digest({ nextRunAt: now - 7 * 3600_000 }) },
      future: { digest: digest({ nextRunAt: now + 3600_000 }) },
      off: { digest: digest({ enabled: false, nextRunAt: now - 1 }) },
    },
    feed: [post('a')],
  });
  const outcomes = await tick(deps, now);
  assert.deepEqual(outcomes, { due: 'sent', late: 'skipped_late' });
  assert.deepEqual(calls.dm.map(([id]) => id), ['due']);
  assert.equal(new Date(store.data.due.digest.nextRunAt).toISOString(), '2026-10-27T08:00:00.000Z');
  assert.ok(store.data.late.digest.nextRunAt > now);
  assert.equal(store.data.future.digest.nextRunAt, now + 3600_000);
});
