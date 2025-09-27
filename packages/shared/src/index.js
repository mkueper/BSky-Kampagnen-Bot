export function formatSkeetDraft({ title, body }) {
  const trimmed = (body ?? '').trim();
  if (!trimmed) {
    return title ?? '';
  }
  return [title, trimmed].filter(Boolean).join(' — ');
}

export const AVAILABLE_PLATFORMS = [
  { id: 'bluesky', label: 'Bluesky' },
  { id: 'mastodon', label: 'Mastodon' },
];

export const RECURRENCE_OPTIONS = [
  { id: 'none', label: 'Keine Wiederholung' },
  { id: 'daily', label: 'Täglich' },
  { id: 'weekly', label: 'Wöchentlich' },
  { id: 'monthly', label: 'Monatlich' },
];

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Montag' },
  { value: 2, label: 'Dienstag' },
  { value: 3, label: 'Mittwoch' },
  { value: 4, label: 'Donnerstag' },
  { value: 5, label: 'Freitag' },
  { value: 6, label: 'Samstag' },
  { value: 0, label: 'Sonntag' },
];

const DEFAULT_LOCALE = 'de-DE';

function formatTimePart(date, locale = DEFAULT_LOCALE) {
  if (!date) return '';
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatScheduleSummary({
  scheduledFor,
  recurrence,
  repeatDayOfWeek,
  repeatDayOfMonth,
  locale = DEFAULT_LOCALE,
} = {}) {
  const date = toDate(scheduledFor);
  const timePart = formatTimePart(date, locale);

  switch (recurrence) {
    case 'daily':
      return timePart ? `Täglich um ${timePart}` : 'Täglich';
    case 'weekly': {
      const weekday = WEEKDAY_OPTIONS.find((option) => option.value === repeatDayOfWeek)?.label;
      if (!weekday && !timePart) return 'Wöchentlich';
      if (!weekday) return `Wöchentlich um ${timePart}`;
      return timePart ? `Wöchentlich am ${weekday} um ${timePart}` : `Wöchentlich am ${weekday}`;
    }
    case 'monthly': {
      const day = repeatDayOfMonth || (date ? date.getDate() : null);
      if (!day && !timePart) return 'Monatlich';
      if (!day) return `Monatlich um ${timePart}`;
      const suffix = `${day}.`;
      return timePart ? `Monatlich am ${suffix} um ${timePart}` : `Monatlich am ${suffix}`;
    }
    case 'none':
    default: {
      if (!date) return 'Keine Wiederholung';
      const day = date.toLocaleDateString(locale);
      return timePart ? `Am ${day} um ${timePart}` : `Am ${day}`;
    }
  }
}
