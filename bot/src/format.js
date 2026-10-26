// Pure formatting helpers (no discord.js imports) so they can be unit-tested.
import { STRINGS } from './i18n.js';

const DAILY_DEV_BLUE = 0x2b7fff;
const MAX_DESCRIPTION = 4000; // Discord limit is 4096
const MAX_TITLE = 200;

/** Escape characters that would break a Discord markdown link label. */
export function escapeLabel(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/([\\[\]()*_~`|>])/g, '\\$1')
    .trim();
}

export function truncate(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function postLink(post) {
  return post.url || post.commentsPermalink || `https://app.daily.dev/posts/${post.id}`;
}

export function discussionLink(post) {
  return post.commentsPermalink || `https://app.daily.dev/posts/${post.id}`;
}

export function formatPostLine(post, index, strings = STRINGS.en) {
  const title = escapeLabel(truncate(post.title || strings.untitled, MAX_TITLE));
  const meta = [
    post.source?.name,
    `▲ ${post.numUpvotes ?? 0}`,
    `💬 ${post.numComments ?? 0}`,
    post.readTime ? `${post.readTime} min` : null,
  ].filter(Boolean);
  const tags = (post.tags ?? []).slice(0, 3).map((t) => `\`${t}\``).join(' ');
  return [
    `**${index}. [${title}](${postLink(post)})**`,
    `${meta.join(' · ')}${tags ? ` · ${tags}` : ''} · [${strings.discussion}](${discussionLink(post)})`,
  ].join('\n');
}

export function sourceLabel(digest, strings = STRINGS.en) {
  if (digest.source === 'custom') return digest.feedName ? `${strings.sources.custom}: ${digest.feedName}` : strings.sources.custom;
  return strings.sources[digest.source] ?? strings.sources.foryou;
}

/** Plain embed object for one digest DM. */
export function buildDigestEmbed({ posts, digest, strings = STRINGS.en, preview = false }) {
  let description = '';
  posts.forEach((post, i) => {
    const line = formatPostLine(post, i + 1, strings);
    if (description.length + line.length + 2 <= MAX_DESCRIPTION) description += (description ? '\n\n' : '') + line;
  });
  return {
    color: DAILY_DEV_BLUE,
    title: `${preview ? '👀 ' : '☕ '}${strings.digestTitle(sourceLabel(digest, strings))}`,
    url: 'https://app.daily.dev',
    description: description || strings.nothingNew,
    footer: { text: strings.digestFooter },
  };
}
