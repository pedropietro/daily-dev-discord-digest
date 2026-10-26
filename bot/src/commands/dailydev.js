// /dailydev connect | disconnect | status | digest on | digest off | digest preview   (all replies ephemeral)
import { SlashCommandBuilder } from 'discord.js';
import { runDigest } from '../digest.js';
import { sourceLabel } from '../format.js';
import { STRINGS, t } from '../i18n.js';
import { DAY_OPTIONS, formatTime, isValidTimeZone, nextRunAt, parseTime } from '../schedule.js';
import { connectRow, ephemeral, errorMessage, logUnexpected, PT } from './common.js';

const FEED_CACHE_TTL_MS = 10 * 60 * 1000;
const ALL_TIME_ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];

const dayChoices = DAY_OPTIONS.map((value) => ({
  name: STRINGS.en.days[value],
  name_localizations: { [PT]: STRINGS.ptBR.days[value] },
  value,
}));
const sourceChoices = Object.keys(STRINGS.en.sources).map((value) => ({
  name: STRINGS.en.sources[value],
  name_localizations: { [PT]: STRINGS.ptBR.sources[value] },
  value,
}));

export const data = new SlashCommandBuilder()
  .setName('dailydev')
  .setDescription('Get your own daily.dev digest by DM')
  .setDescriptionLocalizations({ [PT]: 'Receba por DM o seu próprio digest do daily.dev' })
  .addSubcommand((sub) =>
    sub.setName('connect').setNameLocalizations({ [PT]: 'conectar' })
      .setDescription('Link your daily.dev account (read-only)')
      .setDescriptionLocalizations({ [PT]: 'Vincula a sua conta do daily.dev (somente leitura)' }),
  )
  .addSubcommand((sub) =>
    sub.setName('disconnect').setNameLocalizations({ [PT]: 'desconectar' })
      .setDescription('Unlink your account, stop the digest and delete your tokens')
      .setDescriptionLocalizations({ [PT]: 'Desvincula a conta, para o digest e apaga seus tokens' }),
  )
  .addSubcommand((sub) =>
    sub.setName('status')
      .setDescription('Show your connection and digest schedule')
      .setDescriptionLocalizations({ [PT]: 'Mostra a sua conexão e o agendamento do digest' }),
  )
  .addSubcommandGroup((group) =>
    group.setName('digest')
      .setDescription('Your scheduled digest')
      .setDescriptionLocalizations({ [PT]: 'O seu digest agendado' })
      .addSubcommand((sub) =>
        sub.setName('on').setNameLocalizations({ [PT]: 'ativar' })
          .setDescription('Turn on (or change) your digest')
          .setDescriptionLocalizations({ [PT]: 'Ativa (ou altera) o seu digest' })
          .addStringOption((o) =>
            o.setName('time').setNameLocalizations({ [PT]: 'horario' })
              .setDescription('Time of day, 24h (e.g. 08:00)').setDescriptionLocalizations({ [PT]: 'Horário, 24h (ex.: 08:00)' })
              .setRequired(true).setMaxLength(5),
          )
          .addStringOption((o) =>
            o.setName('days').setNameLocalizations({ [PT]: 'dias' })
              .setDescription('Which days (default: every day)').setDescriptionLocalizations({ [PT]: 'Quais dias (padrão: todos)' })
              .addChoices(...dayChoices),
          )
          .addStringOption((o) =>
            o.setName('source').setNameLocalizations({ [PT]: 'fonte' })
              .setDescription('Which feed (default: For You)').setDescriptionLocalizations({ [PT]: 'Qual feed (padrão: For You)' })
              .addChoices(...sourceChoices),
          )
          .addStringOption((o) =>
            o.setName('feed')
              .setDescription('Your custom feed (when source is Custom feed)')
              .setDescriptionLocalizations({ [PT]: 'Seu feed customizado (quando a fonte for Feed customizado)' })
              .setAutocomplete(true),
          )
          .addIntegerOption((o) =>
            o.setName('count').setNameLocalizations({ [PT]: 'quantidade' })
              .setDescription('Posts per digest (3-10, default 5)').setDescriptionLocalizations({ [PT]: 'Posts por digest (3-10, padrão 5)' })
              .setMinValue(3).setMaxValue(10),
          )
          .addStringOption((o) =>
            o.setName('timezone').setNameLocalizations({ [PT]: 'fuso' })
              .setDescription('IANA time zone (default: your daily.dev profile)')
              .setDescriptionLocalizations({ [PT]: 'Fuso IANA (padrão: o do seu perfil no daily.dev)' })
              .setAutocomplete(true),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName('off').setNameLocalizations({ [PT]: 'desativar' })
          .setDescription('Turn your digest off').setDescriptionLocalizations({ [PT]: 'Desativa o seu digest' }),
      )
      .addSubcommand((sub) =>
        sub.setName('preview').setNameLocalizations({ [PT]: 'previa' })
          .setDescription('Send me a digest by DM right now').setDescriptionLocalizations({ [PT]: 'Me manda um digest por DM agora' }),
      ),
  );

/** `${userId}` -> { feeds, expiresAt } — one user's custom feeds are never shown to anyone else. */
const feedCache = new Map();

async function customFeeds(tokens, userId) {
  const hit = feedCache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.feeds;
  const feeds = (await tokens.withClient(userId, (c) => c.getCustomFeeds())).map((f) => ({
    id: f.id,
    name: [f.flags?.icon, f.flags?.name ?? f.slug].filter(Boolean).join(' '),
  }));
  feedCache.set(userId, { feeds, expiresAt: Date.now() + FEED_CACHE_TTL_MS });
  return feeds;
}

const ts = (ms) => `<t:${Math.floor(ms / 1000)}:F>`;

function describe(digest, s) {
  return {
    when: s.when(s.days[digest.days] ?? digest.days, formatTime(digest), digest.timeZone),
    source: sourceLabel(digest, s),
  };
}

export async function execute(interaction, deps) {
  const { tokens, oauth } = deps;
  const s = t(interaction.locale);
  const userId = interaction.user.id;
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  if (!group && sub === 'connect') {
    const record = await tokens.store.get(userId);
    if (record) return interaction.reply({ content: s.alreadyConnected(record.username), ...ephemeral });
    return interaction.reply({ content: s.connectPrompt, components: [connectRow(oauth.createAuthorization(userId).url, s)], ...ephemeral });
  }
  if (!group && sub === 'disconnect') {
    await interaction.deferReply(ephemeral);
    feedCache.delete(userId);
    return interaction.editReply((await tokens.disconnect(userId)) ? s.disconnected : s.notLinked);
  }

  const record = await tokens.store.get(userId);
  if (!record) {
    return interaction.reply({ content: s.notConnected, components: [connectRow(oauth.createAuthorization(userId).url, s)], ...ephemeral });
  }

  if (!group && sub === 'status') {
    const since = record.connectedAt ? `<t:${Math.floor(Date.parse(record.connectedAt) / 1000)}:D>` : '—';
    const d = record.digest;
    let line = s.statusDigestOff;
    if (d?.enabled) {
      const { when, source } = describe(d, s);
      line = s.statusDigestOn(when, source, d.count, ts(d.nextRunAt));
    } else if (d?.pausedReason === 'dm_closed') line = s.statusPaused;
    return interaction.reply({ content: s.status(record.username, since, line), ...ephemeral });
  }

  if (sub === 'off') {
    if (!record.digest?.enabled) return interaction.reply({ content: s.alreadyOff, ...ephemeral });
    await tokens.store.update(userId, { digest: { ...record.digest, enabled: false } });
    return interaction.reply({ content: s.off, ...ephemeral });
  }

  if (sub === 'preview') {
    await interaction.deferReply(ephemeral);
    const outcome = await runDigest(deps, userId, { preview: true });
    const messages = {
      sent: s.previewSent, dm_failed: s.previewDmFailed, paused: s.previewDmFailed,
      rate_limited: s.rateLimited, not_connected: s.reconnect, error: s.genericError, empty: s.previewSent,
    };
    return interaction.editReply(messages[outcome] ?? s.genericError);
  }

  // digest on
  await interaction.deferReply(ephemeral);
  const time = parseTime(interaction.options.getString('time', true));
  if (!time) return interaction.editReply(s.badTime);
  const days = interaction.options.getString('days') ?? record.digest?.days ?? 'daily';
  const source = interaction.options.getString('source') ?? (interaction.options.getString('feed') ? 'custom' : 'foryou');
  const count = interaction.options.getInteger('count') ?? record.digest?.count ?? 5;

  try {
    let timeZone = interaction.options.getString('timezone')?.trim() || record.digest?.timeZone;
    if (!timeZone) {
      const profile = await tokens.withClient(userId, (c) => c.getProfile()); // 1 request, only the first time
      timeZone = profile?.timezone;
    }
    timeZone ||= 'UTC';
    if (!isValidTimeZone(timeZone)) return interaction.editReply(s.badTimeZone(timeZone));

    let feedId = null;
    let feedName = null;
    if (source === 'custom') {
      const wanted = interaction.options.getString('feed') ?? record.digest?.feedId;
      if (!wanted) return interaction.editReply(s.needFeed);
      const feed = (await customFeeds(tokens, userId)).find((f) => f.id === wanted || f.name === wanted);
      if (!feed) return interaction.editReply(s.unknownFeed);
      feedId = feed.id;
      feedName = feed.name;
    }

    const schedule = { ...time, days, timeZone };
    const digest = {
      ...(record.digest ?? {}),
      enabled: true,
      ...schedule,
      source,
      feedId,
      feedName,
      count,
      nextRunAt: nextRunAt(schedule, Date.now()),
      dmFailures: 0,
      pausedReason: null,
      sentIds: record.digest?.sentIds ?? [],
    };
    await tokens.store.update(userId, { digest, locale: interaction.locale });
    const { when, source: label } = describe(digest, s);
    return interaction.editReply(s.scheduled(when, label, count, ts(digest.nextRunAt)));
  } catch (err) {
    logUnexpected('[digest on]', err);
    return interaction.editReply(errorMessage(err, s));
  }
}

/** Custom feed list (user's own, cached) and time zones (local list, no API call). */
export async function autocomplete(interaction, { tokens }) {
  const focused = interaction.options.getFocused(true);
  const typed = String(focused.value ?? '').trim().toLowerCase();
  const respond = (list) => interaction.respond(list.slice(0, 25)).catch(() => {});

  if (focused.name === 'timezone') {
    return respond(ALL_TIME_ZONES.filter((z) => z.toLowerCase().includes(typed)).map((z) => ({ name: z, value: z })));
  }
  if (focused.name === 'feed') {
    try {
      const feeds = await customFeeds(tokens, interaction.user.id);
      return respond(feeds.filter((f) => f.name.toLowerCase().includes(typed)).map((f) => ({ name: f.name.slice(0, 100), value: f.id })));
    } catch {
      return respond([]);
    }
  }
  return respond([]);
}
