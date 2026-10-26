# daily.dev Digest by Discord DM

A Discord bot that sends each member **their own** daily.dev digest by direct message: new posts from their **For You** feed, the **Popular** feed or one of their **custom feeds**, at the time and on the days they choose.

Every member links their own daily.dev account through daily.dev OAuth. The bot has no shared token, never posts in channels, and nobody sees anyone else's feed.

Part of a family of daily.dev Discord bots that share the same OAuth, storage and i18n code: [daily-dev-discord-search](https://github.com/pedropietro/daily-dev-discord-search) and [daily-dev-discord-save](https://github.com/pedropietro/daily-dev-discord-save).

## Contents

- [Commands](#commands)
- [Data access and privacy](#data-access-and-privacy)
- [API usage and quota](#api-usage-and-quota)
- [Language](#language)
- [Setup](#setup)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Limitations](#limitations)

## Commands

All replies are ephemeral (only the member who ran the command sees them). Digests arrive by DM.

| Command | What it does |
|---|---|
| `/dailydev connect` | Link your daily.dev account (read-only OAuth). |
| `/dailydev digest on time:08:00` | Turn the digest on, or change it. Only `time` is required. |
| `/dailydev digest preview` | Send a digest to your DMs right now (works before setup too). |
| `/dailydev digest off` | Pause the digest. Your account stays linked. |
| `/dailydev status` | Show your link and schedule. |
| `/dailydev disconnect` | Stop the digest, delete your tokens and settings, revoke the grant. |

### `digest on` options

| Option | Default | Notes |
|---|---|---|
| `time` (required) | — | 24-hour clock: `08:00`, `7:05`, `19h30` |
| `days` | every day | every day, Monday to Friday, or one weekday |
| `source` | For You | For You, Popular or Custom feed |
| `feed` | — | one of your custom feeds; autocomplete lists only your own feeds |
| `count` | 5 | 3 to 10 posts |
| `timezone` | the time zone in your daily.dev profile, else UTC | IANA name, e.g. `America/Sao_Paulo`; autocomplete is local |

Running `digest on` again only changes what you pass; everything else is kept.

## Data access and privacy

- **One token per member.** Each member authorizes the bot on daily.dev (authorization code + PKCE, scopes `openid profile offline_access read`, resource `https://api.daily.dev/public/v1`). Every API call runs with the token of the member it is for. There is no shared or personal token in the configuration.
- **Delivered only to the token holder.** A digest is built from one member's feed and sent only to that member by DM. Members who have not linked an account get a private Connect button and no API call is made for them.
- **Read-only.** The bot never bookmarks, follows, upvotes or comments. A grant without `read` is refused and revoked.
- **No channel content.** No privileged Discord intents, no message history, no posts in channels.
- **Storage.** Tokens and digest settings are encrypted at rest (AES-256-GCM) in a private file. Refresh tokens are rotated and only the newest is kept.
- **Leaving.** `/dailydev disconnect` deletes everything the bot holds for the member and revokes the refresh token (`POST /auth/oauth2/revoke`). Members can also remove the app under daily.dev → Settings → API → Connected apps.

## API usage and quota

Every request counts against the **member's own** daily.dev API allowance. On the free tier that is **60 requests per minute and 200 per month**.

| Action | Requests | When |
|---|---|---|
| Scheduled digest | **1** (`/feeds/foryou`, `/feeds/popular` or `/feeds/custom/{id}`) | each run |
| `digest preview` | 1 | on demand |
| Time zone lookup (`/profile/`) | 1 | first `digest on` without `timezone`, once |
| Custom feed list (`/feeds/custom/`) | 1 | choosing a custom feed; cached 10 min per member |
| Time zone autocomplete | 0 | local list, no API call |

A daily digest uses about 30 requests a month and a weekday digest about 22, well under the free tier. Empty digests (nothing new) still cost their one request but are not sent. Rate-limit (429) responses are retried once, then the run is skipped.

## Language

Commands and messages are in **English**, localized to **Brazilian Portuguese** for members whose Discord client is set to `pt-BR`, using Discord's per-locale command names.

| English | Brazilian Portuguese |
|---|---|
| `/dailydev connect` | `/dailydev conectar` |
| `/dailydev disconnect` | `/dailydev desconectar` |
| `/dailydev digest on time days source feed count timezone` | `/dailydev digest ativar horario dias fonte feed quantidade fuso` |
| `/dailydev digest off` | `/dailydev digest desativar` |
| `/dailydev digest preview` | `/dailydev digest previa` |

Digests are sent in the language the member used when turning the digest on.

## Setup

### Requirements

- Node.js 18.17 or newer
- A Discord application with a bot user
- A daily.dev OAuth app
- A public HTTPS address that reaches the bot's HTTP port (for the sign-in callback)
- An always-on host (the scheduler runs inside the bot process)

### 1. Create the daily.dev OAuth app

daily.dev → **Settings → API → OAuth apps → Create app**. Set the redirect URI to `https://<your-host>/oauth/callback`. Copy the client ID and the client secret (shown once).

### 2. Configure

```bash
cd bot
npm install
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | yes | Bot token |
| `DISCORD_CLIENT_ID` | yes | Discord application ID |
| `DISCORD_GUILD_ID` | no | Register commands in one server instantly (global registration can take up to an hour) |
| `DAILY_DEV_CLIENT_ID` | yes | daily.dev OAuth client ID |
| `DAILY_DEV_CLIENT_SECRET` | yes | daily.dev OAuth client secret |
| `PUBLIC_BASE_URL` | yes | Public HTTPS URL of this bot, no trailing slash |
| `PORT` | no | HTTP port, default `3000` |
| `TOKEN_ENCRYPTION_KEY` | yes | 32 bytes, base64: `openssl rand -base64 32` |
| `DATA_DIR` | no | Where the encrypted token file lives, default `./data` |
| `SCHEDULER_INTERVAL_SECONDS` | no | How often due digests are checked, default `60` |

### 3. Invite the bot

Discord developer portal → **OAuth2 → URL Generator** → scopes `bot` and `applications.commands`. No extra permissions or privileged intents are needed. Members must share a server with the bot and allow direct messages from it.

### 4. Register the command and run

```bash
npm run deploy-commands
npm start
```

Or with Docker:

```bash
docker build -t dd-digest bot/
docker run -d --restart unless-stopped --env-file bot/.env -p 3000:3000 -v dd-digest-data:/app/data dd-digest
```

For local testing, `cloudflared tunnel --url http://localhost:3000` gives you an HTTPS `PUBLIC_BASE_URL`; register that callback on the OAuth app. `GET /healthz` should return `ok`.

## How it works

- **Scheduler** (`scheduler.js`): every minute it sends each due digest, one member at a time, then schedules the next run. Passes never overlap. After downtime, digests more than six hours late are skipped instead of arriving at odd hours.
- **Schedule** (`schedule.js`): converts "HH:MM on these days in this time zone" into the next UTC instant using only `Intl`, including daylight saving changes.
- **Digest** (`digest.js`): one request with the member's token, fetching twice the posts needed and dropping the last 300 already sent, so posts don't repeat. Nothing new means no DM. Three failed DMs in a row (DMs closed) pause the digest and `/dailydev status` explains how to resume.
- **Tokens** (`tokenManager.js`): access tokens are refreshed shortly before expiry, one refresh at a time per member, without overwriting settings saved meanwhile. A dead refresh token unlinks the member; transient errors keep the grant.

## Project structure

```
bot/src/
├── index.js              Discord client, DM sender, OAuth callback server, scheduler start
├── commands/dailydev.js  connect | disconnect | status | digest on/off/preview, autocomplete
├── commands/common.js    shared buttons and error messages
├── scheduler.js          minute ticker, lateness guard, rescheduling
├── schedule.js           time parsing, time zones, next run (DST-safe)
├── digest.js             build (1 request, no repeats) and deliver by DM, failure handling
├── format.js             digest embed
├── i18n.js               English and Brazilian Portuguese strings
├── oauth.js              PKCE S256, state, code exchange, refresh rotation, revoke
├── tokenStore.js         per-member tokens and settings, AES-256-GCM, atomic writes
├── tokenManager.js       valid token per member, single-flight refresh, retry on 401
├── server.js             GET /oauth/callback, GET /healthz
├── dailydev.js           Public API client (the token is only ever sent to api.daily.dev)
└── config.js, deploy-commands.js
```

## Testing

```bash
cd bot
npm test
```

The suite covers OAuth (PKCE, state, scope checks, refresh rotation, revocation), encrypted storage, time-zone and DST scheduling, digest building and de-duplication, DM failure handling, the scheduler, command validation and localization.

## Limitations

- Single process: schedules, OAuth state and the token file live in one process. To run replicas, move storage to a database and run the scheduler in one instance.
- Only posts daily.dev returns for the chosen feed are included; the bot does not search the web.

## License

MIT
