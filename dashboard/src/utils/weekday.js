// utils/weekday.js
export function getWeekInfo(locale = (typeof navigator !== 'undefined' ? navigator.language : 'de-DE')) {
  try {
    // Neuere Engines: Intl.Locale.weekInfo
    const loc = new Intl.Locale(locale);
    if (loc && loc.weekInfo && loc.weekInfo.firstDay) {
      return { firstDay: loc.weekInfo.firstDay }; // 1=Mo … 7=So (CLDR)
    }
  } catch (e) {}
  // Fallback: en-US → Sonntag zuerst, sonst Montag
  const isUS = /^en-US/i.test(locale);
  return { firstDay: isUS ? 7 : 1 };
}

export function weekdayOrder(locale) {
  const { firstDay } = getWeekInfo(locale);  // 1..7
  const jsFirst = firstDay % 7;              // 0..6  (0=So,1=Mo,…)
  return Array.from({ length: 7 }, (_, i) => (jsFirst + i) % 7);
}

export function weekdayLabel(idx, locale, width = 'short') {
  // Fixes Datum: 1970-01-04 ist ein Sonntag
  const base = new Date(Date.UTC(1970, 0, 4));
  const d = new Date(base);
  d.setUTCDate(base.getUTCDate() + ((idx - 0 + 7) % 7));
  return new Intl.DateTimeFormat(locale || (typeof navigator !== 'undefined' ? navigator.language : 'de-DE'), {
    weekday: width
  }).format(d);
}
