// Minimal daily.dev public API client. One instance per request, bound to ONE user's OAuth access token.
// The token is only ever sent to this fixed host — never build the base URL from user input.
const BASE_URL = 'https://api.daily.dev/public/v1';
const TIMEOUT_MS = 10_000;

export class DailyDevError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'DailyDevError';
    this.status = status;
    this.code = code;
  }
}

export class DailyDevClient {
  constructor(token, { fetchImpl = globalThis.fetch } = {}) {
    if (!token) throw new Error('daily.dev token is required');
    this.token = token;
    this.fetch = fetchImpl;
  }

  async #get(path, params = {}, { retryOn429 = true } = {}) {
    const url = new URL(BASE_URL + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    const res = await this.fetch(url, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429 && retryOn429) {
      const waitSec = Math.min(Number(res.headers.get('retry-after')) || 2, 5);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      return this.#get(path, params, { retryOn429: false });
    }
    if (res.ok) return res.json();
    const body = await res.json().catch(() => ({}));
    const messages = {
      401: 'daily.dev access token is invalid or expired.',
      404: 'Not found on daily.dev.',
      429: 'daily.dev rate limit or monthly quota reached.',
    };
    throw new DailyDevError(messages[res.status] ?? `daily.dev API error (HTTP ${res.status}).`, res.status, body.error);
  }

  async getProfile() {
    const body = await this.#get('/profile/');
    return body?.data ?? body; // /profile/ returns the profile object at the top level
  }

  async getForYou(limit) {
    return (await this.#get('/feeds/foryou', { limit })).data ?? [];
  }

  async getPopular(limit) {
    return (await this.#get('/feeds/popular', { limit })).data ?? [];
  }

  async getCustomFeeds() {
    return (await this.#get('/feeds/custom/', { limit: 50 })).data ?? [];
  }

  async getCustomFeedPosts(feedId, limit) {
    return (await this.#get(`/feeds/custom/${encodeURIComponent(feedId)}`, { limit })).data ?? [];
  }

  /** One request for any digest source. */
  async getFeed({ source, feedId }, limit) {
    if (source === 'custom') return this.getCustomFeedPosts(feedId, limit);
    if (source === 'popular') return this.getPopular(limit);
    return this.getForYou(limit);
  }
}
