// Pure scheduling helpers: "HH:MM on these days in this IANA timezone" → next UTC instant. No dependencies.

export const DAY_OPTIONS = ['daily', 'weekdays', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return Boolean(tz);
  } catch {
    return false;
  }
}

/** "7:05", "07:05", "19h30" → { hour, minute } or null. */
export function parseTime(text) {
  const m = String(text ?? '').trim().match(/^([01]?\d|2[0-3])\s*[:hH.]\s*([0-5]\d)$/);
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

export function formatTime({ hour, minute }) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Wall-clock parts of an instant in a timezone. */
function localParts(ms, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY_INDEX[parts.weekday.toLowerCase().slice(0, 3)],
  };
}

/** UTC instant for a wall-clock time in a timezone (handles DST by re-checking the offset). */
export function zonedToUtc({ year, month, day, hour, minute }, timeZone) {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = localParts(guess, timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const diff = target - asUtc;
    if (diff === 0) break;
    guess += diff;
  }
  return guess;
}

function dayMatches(days, weekday) {
  if (days === 'daily') return true;
  if (days === 'weekdays') return weekday >= 1 && weekday <= 5;
  return WEEKDAY_INDEX[days] === weekday;
}

/**
 * Next run strictly after `fromMs`.
 * @param {{ hour: number, minute: number, days: string, timeZone: string }} schedule
 */
export function nextRunAt(schedule, fromMs) {
  const { hour, minute, days, timeZone } = schedule;
  const today = localParts(fromMs, timeZone);
  // Walk forward day by day in local calendar terms (8 days covers any weekly schedule).
  const base = Date.UTC(today.year, today.month - 1, today.day);
  for (let i = 0; i <= 8; i++) {
    const d = new Date(base + i * 86_400_000);
    const candidate = zonedToUtc(
      { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour, minute },
      timeZone,
    );
    if (candidate > fromMs && dayMatches(days, localParts(candidate, timeZone).weekday)) return candidate;
  }
  throw new Error('No matching day found for schedule');
}
