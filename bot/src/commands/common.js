import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { DailyDevError } from '../dailydev.js';
import { NotConnectedError } from '../tokenManager.js';

export const PT = 'pt-BR';
export const ephemeral = { flags: MessageFlags.Ephemeral };

export function connectRow(url, s) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(s.connectButton).setEmoji('🔗'),
  );
}

export function errorMessage(err, s) {
  if (err instanceof NotConnectedError) return s.reconnect;
  if (err instanceof DailyDevError && err.status === 429) return s.rateLimited;
  if (err instanceof DailyDevError && err.status === 403) return s.forbidden;
  if (err?.name === 'TimeoutError') return s.timeout;
  return s.genericError;
}

export function logUnexpected(tag, err) {
  if (!(err instanceof NotConnectedError) && !(err instanceof DailyDevError)) console.error(tag, err);
}
