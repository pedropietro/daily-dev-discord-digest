# daily.dev Marketplace submission

Form fields for https://daily.dev/marketplace/submit (or `POST /public/v1/plugins`).

## Name (3–60 characters)

daily.dev Digest by Discord DM

## Short description (up to 300 characters)

Get your own daily.dev digest as a Discord DM: new posts from your For You feed, the Popular feed or one of your custom feeds, at the time and on the days you choose. Every member uses their own daily.dev account.

## About (up to 20,000 characters, no links or images)

Most of us mean to open daily.dev every morning and don't. This bot brings your feed to the place you already check: a short digest of new posts, sent to you by Discord direct message on your schedule.

How it works
- Link your daily.dev account once with /dailydev connect, through daily.dev OAuth with read-only access.
- Turn the digest on with /dailydev digest on and pick a time. You can also choose the days (every day, Monday to Friday, or one day a week), the feed (For You, Popular or one of your custom feeds), how many posts (3 to 10) and your time zone. By default the time zone comes from your daily.dev profile.
- At that time you get a DM with the new posts: title, source, upvotes, comments, read time, tags and a link to the discussion. Posts you already received are skipped, and if there is nothing new you get no message.
- /dailydev digest preview sends one right away, /dailydev status shows your schedule, /dailydev digest off pauses it and /dailydev disconnect removes everything.

Data access and privacy
Every member authorizes the bot with their own daily.dev account. Each digest is built with the token of the member who receives it and is delivered only to that member, by direct message. The bot has no shared token, never posts in channels and never shows one member's feed to anyone else. Members who have not linked an account get a private Connect button and no API call is made for them. The bot only reads: it never bookmarks, follows, upvotes or comments. Tokens and settings are encrypted at rest, and disconnecting deletes them and revokes the grant.

API usage and quota
Every request counts against the member's own daily.dev API allowance. On the free tier that is 60 requests per minute and 200 requests per month. A digest costs one request, so a daily digest uses about 30 requests a month and a weekday digest about 22. Setting it up costs one or two more requests, once: reading the time zone from your profile and listing your custom feeds. The time zone suggestions while typing use no requests.

Reliability
Schedules follow your time zone, including daylight saving changes. If the bot was offline, digests more than six hours late are skipped instead of arriving at odd hours. If your DMs are closed, the digest pauses itself after three failed attempts, and /dailydev status explains how to turn it back on.

Language
Commands and messages are in English. Members whose Discord app is set to Brazilian Portuguese see localized command names and messages, for example /dailydev digest ativar.

Setup
The server owner needs Node.js 18 or newer, a Discord application, a daily.dev OAuth app, a public HTTPS address for the sign-in callback and an always-on host. The included agent skill walks your coding agent through configuration, testing and deployment, locally or with the included Dockerfile.

## Link

https://github.com/pedropietro/daily-dev-discord-digest
