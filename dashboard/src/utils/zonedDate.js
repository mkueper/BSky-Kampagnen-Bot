const ENV_TIME_ZONE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TIME_ZONE) || null;
const BROWSER_TIME_ZONE =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';
export const DEFAULT_TIME_ZONE = ENV_TIME_ZONE || BROWSER_TIME_ZONE || 'UTC';

const formatterCache = new Map();

function getFormatter(timeZone = DEFAULT_TIME_ZONE) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    );
  }
  return formatterCache.get(timeZone);
}

function getParts(date, timeZone = DEFAULT_TIME_ZONE) {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const lookup = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      lookup[part.type] = part.value;
    }
  }
  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
    hour: lookup.hour,
    minute: lookup.minute,
    second: lookup.second
  };
}

function getTimeZoneOffset(date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = getParts(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

export function zonedDateTimeToUtc(
  { year, month, day, hour = 0, minute = 0, second = 0 },
  timeZone = DEFAULT_TIME_ZONE
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const guessDate = new Date(utcGuess);
  const offset = getTimeZoneOffset(guessDate, timeZone);
  return new Date(utcGuess - offset);
}

export function formatDateTimeLocal(value, timeZone = DEFAULT_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const parts = getParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function getInputPartsFromUtc(value, timeZone = DEFAULT_TIME_ZONE) {
  const formatted = formatDateTimeLocal(value, timeZone);
  if (!formatted) return null;
  const [date, time] = formatted.split('T');
  return { date, time };
}

export function getDefaultDateParts(timeZone = DEFAULT_TIME_ZONE) {
  const now = new Date();
  const parts = getParts(now, timeZone);
  const base = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 0, 0, 0)
  );
  base.setUTCDate(base.getUTCDate() + 1);
  const next = {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate()
  };
  const localNine = zonedDateTimeToUtc({ ...next, hour: 9, minute: 0 }, timeZone);
  return getInputPartsFromUtc(localNine, timeZone);
}

export function resolvePreferredTimeZone(preferred) {
  return preferred || DEFAULT_TIME_ZONE;
}
