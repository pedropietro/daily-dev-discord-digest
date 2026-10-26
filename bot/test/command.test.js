import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MessageFlags } from 'discord.js';
import { autocomplete, data, execute } from '../src/commands/dailydev.js';

const oauth = { createAuthorization: (id) => ({ url: `https://api.daily.dev/auth/oauth2/authorize?u=${id}`, state: 's' }) };

function fakeTokens({ records = { alice: { username: 'alice', connectedAt: '2026-10-01T00:00:00Z' } }, profileTz = 'America/Sao_Paulo', feeds = [] } = {}) {
  const calls = [];
  const store = {
    data: records,
    get: async (id) => (store.data[id] ? structuredClone(store.data[id]) : null),
    update: async (id, patch) => { store.data[id] = { ...store.data[id], ...patch }; return store.data[id]; },
  };
  return {
    calls,
    store,
    withClient: async (id, fn) => fn({
      getProfile: async () => (calls.push([id, 'profile']), { timezone: profileTz }),
      getCustomFeeds: async () => (calls.push([id, 'feeds']), feeds),
    }),
    disconnect: async () => true,
  };
}

function interaction({ user = 'alice', locale = 'en-US', group = null, sub, opts = {} }) {
  const out = {};
  return {
    out,
    user: { id: user },
    locale,
    options: {
      getSubcommandGroup: () => group,
      getSubcommand: () => sub,
      getString: (k) => opts[k] ?? null,
      getInteger: (k) => opts[k] ?? null,
    },
    reply: async (o) => { out.reply = o; },
    deferReply: async (o) => { out.deferred = o; },
    editReply: async (o) => { out.edit = o; },
  };
}

test('command tree: EN names with pt-BR localizations', () => {
  const j = data.toJSON();
  const group = j.options.find((o) => o.name === 'digest');
  assert.deepEqual(group.options.map((o) => [o.name, o.name_localizations['pt-BR']]), [['on', 'ativar'], ['off', 'desativar'], ['preview', 'previa']]);
  assert.deepEqual(group.options[0].options.map((o) => o.name), ['time', 'days', 'source', 'feed', 'count', 'timezone']);
});

test('digest on: uses the daily.dev profile time zone once, stores schedule, replies privately', async () => {
  const tokens = fakeTokens();
  const i = interaction({ group: 'digest', sub: 'on', locale: 'pt-BR', opts: { time: '08:00' } });
  await execute(i, { tokens, oauth });
  const d = tokens.store.data.alice.digest;
  assert.equal(i.out.deferred.flags, MessageFlags.Ephemeral);
  assert.equal(d.timeZone, 'America/Sao_Paulo');
  assert.equal(d.enabled, true);
  assert.equal(d.days, 'daily');
  assert.equal(d.source, 'foryou');
  assert.equal(d.count, 5);
  assert.ok(d.nextRunAt > Date.now());
  assert.equal(tokens.store.data.alice.locale, 'pt-BR');
  assert.match(i.out.edit, /Digest ativado/);

  // Changing only the time keeps the zone and makes no new profile request.
  await execute(interaction({ group: 'digest', sub: 'on', opts: { time: '19:30' } }), { tokens, oauth });
  assert.deepEqual(tokens.calls, [['alice', 'profile']]);
  assert.equal(tokens.store.data.alice.digest.hour, 19);
});

test('validation: bad time, bad zone, custom feed must exist', async () => {
  const tokens = fakeTokens({ feeds: [{ id: 'F1', slug: 'javablockchain-f1', flags: { name: 'JavaBlockchain', icon: '⛓️' } }] });
  const a = interaction({ group: 'digest', sub: 'on', opts: { time: '8am' } });
  await execute(a, { tokens, oauth });
  assert.match(a.out.edit, /24-hour/);
  const b = interaction({ group: 'digest', sub: 'on', opts: { time: '08:00', timezone: 'Mars/Base' } });
  await execute(b, { tokens, oauth });
  assert.match(b.out.edit, /not a valid time zone/);
  const c = interaction({ group: 'digest', sub: 'on', opts: { time: '08:00', source: 'custom', feed: 'nope', timezone: 'UTC' } });
  await execute(c, { tokens, oauth });
  assert.match(c.out.edit, /not found/);
  const d = interaction({ group: 'digest', sub: 'on', opts: { time: '08:00', feed: 'F1', timezone: 'UTC' } });
  await execute(d, { tokens, oauth });
  assert.equal(tokens.store.data.alice.digest.source, 'custom');
  assert.equal(tokens.store.data.alice.digest.feedName, '⛓️ JavaBlockchain');
});

test('unlinked user gets a private connect button; off/status work', async () => {
  const tokens = fakeTokens();
  const x = interaction({ user: 'bob', group: 'digest', sub: 'on', opts: { time: '08:00' } });
  await execute(x, { tokens, oauth });
  assert.match(x.out.reply.content, /Connect your daily\.dev account/);
  assert.equal(x.out.reply.flags, MessageFlags.Ephemeral);

  await execute(interaction({ group: 'digest', sub: 'on', opts: { time: '08:00', timezone: 'UTC' } }), { tokens, oauth });
  const st = interaction({ sub: 'status' });
  await execute(st, { tokens, oauth });
  assert.match(st.out.reply.content, /Digest: \*\*on\*\*/);
  const off = interaction({ group: 'digest', sub: 'off' });
  await execute(off, { tokens, oauth });
  assert.match(off.out.reply.content, /Digest off/);
  assert.equal(tokens.store.data.alice.digest.enabled, false);
});

test('preview sends a DM through runDigest and reports DM problems', async () => {
  const tokens = fakeTokens();
  tokens.withClient = async (id, fn) => fn({ getFeed: async () => [{ id: 'p', title: 'Hello', url: 'https://x.dev/p' }] });
  const sent = [];
  const ok = interaction({ group: 'digest', sub: 'preview' });
  await execute(ok, { tokens, oauth, sendDm: async (id, p) => sent.push([id, p]) });
  assert.equal(ok.out.edit, '📬 Preview sent to your DMs.');
  assert.equal(sent[0][0], 'alice');
  const bad = interaction({ group: 'digest', sub: 'preview' });
  await execute(bad, { tokens, oauth, sendDm: async () => { throw new Error('closed'); } });
  assert.match(bad.out.edit, /couldn't DM you/);
});

test('time zone autocomplete is local (no API call); feed autocomplete lists only the user\'s feeds', async () => {
  const tokens = fakeTokens({ feeds: [{ id: 'F1', flags: { name: 'JavaBlockchain', icon: '⛓️' } }, { id: 'F2', flags: { name: 'Web3' } }] });
  const res = [];
  const ac = (name, value, user = 'alice') => ({ user: { id: user }, options: { getFocused: () => ({ name, value }) }, respond: async (c) => res.push(c) });
  await autocomplete(ac('timezone', 'sao_p'), { tokens });
  assert.deepEqual(res[0], [{ name: 'America/Sao_Paulo', value: 'America/Sao_Paulo' }]);
  assert.deepEqual(tokens.calls, []);
  await autocomplete(ac('feed', 'java'), { tokens });
  assert.deepEqual(res[1], [{ name: '⛓️ JavaBlockchain', value: 'F1' }]);
});
