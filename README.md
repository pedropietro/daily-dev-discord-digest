# daily.dev Digest by Discord DM

Each member links their own daily.dev account and gets a short digest of **new** posts by Discord DM, from their **For You** feed, the **Popular** feed or one of their **custom feeds**, at the time and days they choose.

```
/dailydev connect                                  → link your daily.dev account (once, read-only)
/dailydev digest on time:08:00 days:weekdays source:For You count:5
/dailydev digest preview                           → send one now
/dailydev status | /dailydev digest off | /dailydev disconnect
```

pt-BR clients see `/dailydev conectar`, `/dailydev digest ativar horario:08:00 dias:… fonte:… quantidade:… fuso:…`, `previa`, `desativar` and Portuguese messages.

Third project in the family, after [daily-dev-discord-search](https://github.com/pedropietro/daily-dev-discord-search) and [daily-dev-discord-save](https://github.com/pedropietro/daily-dev-discord-save); same OAuth, storage and i18n patterns.

## `digest on` options

| Option (EN / pt-BR) | Default | Notes |
|---|---|---|
| `time` / `horario` (required) | — | 24h, `08:00`, `7:05`, `19h30` |
| `days` / `dias` | every day | every day, Monday–Friday, or one weekday |
| `source` / `fonte` | For You | For You, Popular, Custom feed |
| `feed` | — | your custom feeds (autocomplete, your own list only) |
| `count` / `quantidade` | 5 | 3–10 posts |
| `timezone` / `fuso` | your daily.dev profile time zone, else UTC | IANA names, local autocomplete (no API call) |

Running `digest on` again changes the schedule and keeps what you don't override.

## How it works

- **Scheduler** (`scheduler.js`): every 60 s, sends each due digest one user at a time, then computes the next run with `schedule.js` (pure `Intl`-based time-zone math, DST-safe). Digests more than 6 h late (after downtime) are skipped.
- **Digest** (`digest.js`): exactly **one** API request per digest with the recipient's token, fetching 2× the posts and dropping the last 300 already sent. Empty digests aren't sent. Three failed DMs in a row pause the digest.
- **Privacy**: digests go only to the token holder by DM; every command reply is ephemeral; nothing is posted in channels.

## Structure

```
bot/src/
├── index.js             Discord client, DM sender, OAuth callback server, scheduler start
├── commands/dailydev.js connect | disconnect | status | digest on/off/preview, autocomplete
├── commands/common.js   shared buttons and error messages
├── scheduler.js         minute ticker, lateness guard, rescheduling
├── schedule.js          parseTime, time zones, nextRunAt (DST-safe)
├── digest.js            build (1 request, dedupe) and deliver by DM, failure handling
├── format.js, i18n.js   embeds and EN / pt-BR strings
├── oauth.js             PKCE S256, state, code exchange, refresh rotation, revoke (read-only scope)
├── tokenStore.js        per-user tokens + settings, AES-256-GCM, atomic writes
├── tokenManager.js      valid token per user, single-flight refresh (keeps settings saved meanwhile)
├── server.js            GET /oauth/callback, GET /healthz
├── dailydev.js          Public API client (token only ever sent to api.daily.dev)
└── config.js, deploy-commands.js
```

## Running

1. Node.js 18.17+. In `bot/`: `npm install && npm test`
2. daily.dev → Settings → API → OAuth apps → Create app, redirect URI `https://<your-host>/oauth/callback`.
3. `cp .env.example .env`: Discord token/client ID, `DAILY_DEV_CLIENT_ID/SECRET`, `PUBLIC_BASE_URL`, `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`).
4. Invite the bot: OAuth2 → URL Generator → scopes `bot` + `applications.commands`.
5. `npm run deploy-commands`, then `npm start` on an always-on host — or:
   ```bash
   docker build -t dd-digest bot/
   docker run -d --restart unless-stopped --env-file bot/.env -p 3000:3000 -v dd-digest-data:/app/data dd-digest
   ```

Members need to share a server with the bot and allow DMs from that server.

## Quota

1 request per digest from the recipient's own allowance (free tier: 60/min, **200/month**): daily ≈ 30/month, weekdays ≈ 22/month. Setup: 1 profile read (time zone) and 1 custom-feed list, once.

## Limits

Single process: schedules, OAuth state and the token file live in one process. For replicas, move storage to a database and run the scheduler in one instance.
