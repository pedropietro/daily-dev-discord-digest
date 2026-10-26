import 'dotenv/config';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

function clampInt(raw, fallback, min, max) {
  const n = Number.parseInt(raw ?? '', 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function encryptionKey() {
  const key = Buffer.from(required('TOKEN_ENCRYPTION_KEY'), 'base64');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32).');
  }
  return key;
}

/**
 * @param {{ requireRuntime?: boolean }} opts  false = only what deploy-commands needs
 */
export function loadConfig({ requireRuntime = true } = {}) {
  const base = {
    discordToken: required('DISCORD_TOKEN'),
    discordClientId: required('DISCORD_CLIENT_ID'),
    discordGuildId: process.env.DISCORD_GUILD_ID?.trim() || null,
  };
  if (!requireRuntime) return base;

  const publicBaseUrl = required('PUBLIC_BASE_URL').replace(/\/+$/, '');
  return {
    ...base,
    // daily.dev OAuth app (Settings > API > OAuth apps). Redirect URI must be `${PUBLIC_BASE_URL}/oauth/callback`.
    oauthClientId: required('DAILY_DEV_CLIENT_ID'),
    oauthClientSecret: required('DAILY_DEV_CLIENT_SECRET'),
    publicBaseUrl,
    redirectUri: `${publicBaseUrl}/oauth/callback`,
    port: clampInt(process.env.PORT, 3000, 1, 65535),
    dataDir: process.env.DATA_DIR?.trim() || './data',
    encryptionKey: encryptionKey(),
    schedulerIntervalMs: clampInt(process.env.SCHEDULER_INTERVAL_SECONDS, 60, 15, 600) * 1000,
  };
}
