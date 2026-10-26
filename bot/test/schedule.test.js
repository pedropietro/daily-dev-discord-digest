import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidTimeZone, nextRunAt, parseTime, zonedToUtc } from '../src/schedule.js';

const iso = (ms) => new Date(ms).toISOString();

test('parseTime accepts 24h formats and rejects nonsense', () => {
  assert.deepEqual(parseTime('08:00'), { hour: 8, minute: 0 });
  assert.deepEqual(parseTime('7:05'), { hour: 7, minute: 5 });
  assert.deepEqual(parseTime('19h30'), { hour: 19, minute: 30 });
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('8am'), null);
});

test('isValidTimeZone', () => {
  assert.ok(isValidTimeZone('America/Sao_Paulo'));
  assert.ok(!isValidTimeZone('Mars/Olympus'));
  assert.ok(!isValidTimeZone(''));
});

test('São Paulo (UTC-3, no DST): 08:00 local is 11:00 UTC', () => {
  const s = { hour: 8, minute: 0, days: 'daily', timeZone: 'America/Sao_Paulo' };
  assert.equal(iso(nextRunAt(s, Date.parse('2026-10-26T10:00:00Z'))), '2026-10-26T11:00:00.000Z');
  assert.equal(iso(nextRunAt(s, Date.parse('2026-10-26T11:00:00Z'))), '2026-10-27T11:00:00.000Z', 'strictly after');
});

test('Lisbon across the DST change (last Sunday of October 2026)', () => {
  const s = { hour: 9, minute: 30, days: 'daily', timeZone: 'Europe/Lisbon' };
  // Saturday 24 Oct: still summer time (UTC+1) → 08:30Z. Monday 26 Oct: winter time (UTC+0) → 09:30Z.
  assert.equal(iso(nextRunAt(s, Date.parse('2026-10-24T00:00:00Z'))), '2026-10-24T08:30:00.000Z');
  assert.equal(iso(nextRunAt(s, Date.parse('2026-10-25T23:00:00Z'))), '2026-10-26T09:30:00.000Z');
});

test('weekdays skip the weekend; weekly lands on the chosen day', () => {
  const fri = Date.parse('2026-10-30T12:00:00Z'); // Friday, after 08:00 in São Paulo
  const weekdays = { hour: 8, minute: 0, days: 'weekdays', timeZone: 'America/Sao_Paulo' };
  assert.equal(iso(nextRunAt(weekdays, fri)), '2026-11-02T11:00:00.000Z'); // Monday
  const weekly = { hour: 18, minute: 0, days: 'sun', timeZone: 'America/Sao_Paulo' };
  assert.equal(iso(nextRunAt(weekly, fri)), '2026-11-01T21:00:00.000Z'); // Sunday 18:00 local
});

test('zonedToUtc round-trips a wall-clock time', () => {
  assert.equal(iso(zonedToUtc({ year: 2026, month: 1, day: 15, hour: 7, minute: 0 }, 'Asia/Tokyo')), '2026-01-14T22:00:00.000Z');
});
