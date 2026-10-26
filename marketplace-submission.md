# Submissão ao daily.dev Marketplace

## Name (3–60 caracteres)

daily.dev Digest by Discord DM

## Short description (até 300 caracteres)

Get your own daily.dev digest as a Discord DM: new posts from your For You feed, the popular feed or one of your custom feeds, at the time and days you choose. Each member uses their own account.

## About (até 20.000 caracteres, SEM links nem imagens)

Most of us mean to open daily.dev every morning and don't. This bot brings your feed to the place you already check: a short digest of new posts, sent to you by Discord DM on your schedule.

How it works
- Link your daily.dev account once with /dailydev connect, through daily.dev OAuth with read-only access.
- Turn the digest on with /dailydev digest on and pick a time. Optionally choose the days (every day, Monday to Friday, or one day a week), the feed (For You, Popular or one of your custom feeds), how many posts (3 to 10) and your time zone. By default the time zone comes from your daily.dev profile.
- At that time the bot sends you a DM with the new posts: title, source, upvotes, comments, read time, tags and a link to the discussion. Posts you already received are skipped, and if there is nothing new you get no message.
- /dailydev digest preview sends one right away. /dailydev status shows your schedule. /dailydev digest off pauses it, and /dailydev disconnect removes everything.

Your own account, your own data
Each digest is built with the daily.dev account of the member who receives it and is delivered only to them, by direct message. There is no shared token, nothing is posted in channels, and nobody sees anyone else's feed. Disconnecting deletes your tokens and settings from the bot and revokes them.

API usage and limits
A digest costs one request against your own daily.dev API allowance. On the free tier that is 60 requests per minute and 200 per month, so a daily digest uses about 30 requests a month and a weekday digest about 22. Setting it up costs one or two more requests, once. The bot only reads: it never bookmarks, follows, upvotes or comments.

Reliability
Schedules follow your time zone, including daylight saving changes. If the bot was offline, digests more than six hours late are skipped instead of arriving at odd hours. If your DMs are closed, the digest pauses itself after three failed attempts and tells you how to turn it back on.

Language
English, with Brazilian Portuguese command names and messages for members whose Discord app is set to Portuguese (for example /dailydev digest ativar).

Setup
The server owner needs Node.js 18 or newer, a Discord application, a daily.dev OAuth app, a public HTTPS address for the sign-in callback and an always-on host. The included agent skill walks your coding agent through configuration, testing and deployment, locally or with the included Dockerfile.

## Link

https://github.com/pedropietro/daily-dev-discord-digest
