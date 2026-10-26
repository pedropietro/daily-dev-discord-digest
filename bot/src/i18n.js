// English by default; Brazilian Portuguese for users whose Discord client is set to pt-BR.

const en = {
  untitled: 'Untitled',
  discussion: 'discussion',
  sources: { foryou: 'For You', popular: 'Popular', custom: 'Custom feed' },
  days: {
    daily: 'every day', weekdays: 'Monday to Friday',
    mon: 'Mondays', tue: 'Tuesdays', wed: 'Wednesdays', thu: 'Thursdays', fri: 'Fridays', sat: 'Saturdays', sun: 'Sundays',
  },
  digestTitle: (source) => `Your daily.dev digest · ${source}`,
  digestFooter: 'From your own daily.dev account · /dailydev digest off to stop',
  nothingNew: 'Nothing new since your last digest.',
  notConnected:
    'Connect your daily.dev account first. Your digest is built from **your own** feed and uses your own API allowance (1 request per digest; free tier: 200/month).',
  connectButton: 'Connect daily.dev',
  connectPrompt:
    'Click below to sign in to daily.dev and approve **read-only** access. The link works once and expires in 10 minutes.',
  alreadyConnected: (who) => `You are already connected${who ? ` as **${who}**` : ''}. Use \`/dailydev disconnect\` to unlink.`,
  disconnected:
    'Disconnected. Your digest is off and your tokens were deleted from this bot and revoked. You can also remove the app under daily.dev → Settings → API → Connected apps.',
  notLinked: 'You have no daily.dev account connected to this bot.',
  badTime: 'Use a time like `08:00` or `19:30` (24-hour clock).',
  badTimeZone: (tz) => `\`${tz}\` is not a valid time zone. Use an IANA name like \`America/Sao_Paulo\` or \`Europe/Lisbon\`.`,
  needFeed: 'Pick one of your custom feeds in the `feed` option (start typing to see them).',
  unknownFeed: 'That custom feed was not found in your daily.dev account.',
  scheduled: (when, source, count, next) =>
    `✅ Digest on: **${count} posts** from **${source}**, ${when}. Next one: ${next}.\nIt arrives by DM, so keep DMs from this server's members/apps allowed. Try \`/dailydev digest preview\` now.`,
  when: (days, time, tz) => `${days} at **${time}** (${tz})`,
  off: '🛑 Digest off. Your account stays connected; turn it back on with `/dailydev digest on`.',
  alreadyOff: 'Your digest is already off.',
  previewSent: '📬 Preview sent to your DMs.',
  previewDmFailed: "I couldn't DM you. Allow direct messages from this server (Server menu → Privacy settings) and try again.",
  status: (who, since, digest) =>
    `Connected${who ? ` as **${who}**` : ''} since ${since}.\n${digest}`,
  statusDigestOn: (when, source, count, next) => `Digest: **on**, ${count} posts from **${source}**, ${when}. Next: ${next}.`,
  statusDigestOff: 'Digest: **off**. Turn it on with `/dailydev digest on`.',
  statusPaused: 'Digest: **paused**, because DMs to you kept failing. Allow DMs and run `/dailydev digest on` again.',
  rateLimited: '⚠️ daily.dev rate limit or monthly allowance reached for your account. Try again later.',
  timeout: '⚠️ daily.dev took too long to answer. Try again.',
  genericError: '⚠️ Could not reach daily.dev right now. Try again in a moment.',
  forbidden: '⚠️ daily.dev refused the request.',
  reconnect: 'Your daily.dev session expired or was revoked. Run `/dailydev connect` again.',
};

const ptBR = {
  untitled: 'Sem título',
  discussion: 'discussão',
  sources: { foryou: 'For You', popular: 'Populares', custom: 'Feed customizado' },
  days: {
    daily: 'todos os dias', weekdays: 'de segunda a sexta',
    mon: 'às segundas', tue: 'às terças', wed: 'às quartas', thu: 'às quintas', fri: 'às sextas', sat: 'aos sábados', sun: 'aos domingos',
  },
  digestTitle: (source) => `Seu digest do daily.dev · ${source}`,
  digestFooter: 'Da sua própria conta do daily.dev · /dailydev digest desativar para parar',
  nothingNew: 'Nada novo desde o último digest.',
  notConnected:
    'Conecte primeiro a sua conta do daily.dev. O digest é montado a partir do **seu** feed e usa a sua própria cota da API (1 requisição por digest; plano gratuito: 200/mês).',
  connectButton: 'Conectar daily.dev',
  connectPrompt:
    'Clique abaixo para entrar no daily.dev e aprovar acesso **somente leitura**. O link vale uma vez e expira em 10 minutos.',
  alreadyConnected: (who) => `Você já está conectado${who ? ` como **${who}**` : ''}. Use \`/dailydev desconectar\` para desvincular.`,
  disconnected:
    'Desconectado. Seu digest foi desligado e seus tokens foram apagados deste bot e revogados. Você também pode remover o app em daily.dev → Settings → API → Connected apps.',
  notLinked: 'Você não tem conta do daily.dev conectada a este bot.',
  badTime: 'Use um horário como `08:00` ou `19:30` (formato 24h).',
  badTimeZone: (tz) => `\`${tz}\` não é um fuso horário válido. Use um nome IANA como \`America/Sao_Paulo\` ou \`Europe/Lisbon\`.`,
  needFeed: 'Escolha um dos seus feeds customizados na opção `feed` (comece a digitar para ver a lista).',
  unknownFeed: 'Esse feed customizado não foi encontrado na sua conta do daily.dev.',
  scheduled: (when, source, count, next) =>
    `✅ Digest ativado: **${count} posts** de **${source}**, ${when}. Próximo: ${next}.\nEle chega por DM, então mantenha as mensagens diretas liberadas. Teste agora com \`/dailydev digest previa\`.`,
  when: (days, time, tz) => `${days} às **${time}** (${tz})`,
  off: '🛑 Digest desativado. Sua conta continua conectada; reative com `/dailydev digest ativar`.',
  alreadyOff: 'Seu digest já está desativado.',
  previewSent: '📬 Prévia enviada por DM.',
  previewDmFailed: 'Não consegui te mandar DM. Libere mensagens diretas deste servidor (menu do servidor → Configurações de privacidade) e tente de novo.',
  status: (who, since, digest) =>
    `Conectado${who ? ` como **${who}**` : ''} desde ${since}.\n${digest}`,
  statusDigestOn: (when, source, count, next) => `Digest: **ativo**, ${count} posts de **${source}**, ${when}. Próximo: ${next}.`,
  statusDigestOff: 'Digest: **desativado**. Ative com `/dailydev digest ativar`.',
  statusPaused: 'Digest: **pausado**, porque as DMs para você falharam várias vezes. Libere as DMs e rode `/dailydev digest ativar` de novo.',
  rateLimited: '⚠️ Você atingiu o limite de requisições ou a cota mensal da sua conta no daily.dev. Tente mais tarde.',
  timeout: '⚠️ O daily.dev demorou para responder. Tente novamente.',
  genericError: '⚠️ Não consegui falar com o daily.dev agora. Tente novamente em instantes.',
  forbidden: '⚠️ O daily.dev recusou a requisição.',
  reconnect: 'Sua sessão do daily.dev expirou ou foi revogada. Rode `/dailydev conectar` de novo.',
};

/** @param {string | undefined} locale  Discord interaction.locale, e.g. 'pt-BR', 'en-US' */
export function t(locale) {
  return locale === 'pt-BR' ? ptBR : en;
}

export const STRINGS = { en, ptBR };
