import { formatTime } from "./formatTime.js";

function resolveLocale(override) {
  if (override) return override;
  try {
    if (typeof navigator !== "undefined" && navigator.language) {
      return navigator.language;
    }
    const resolved = new Intl.DateTimeFormat().resolvedOptions().locale;
    if (resolved) return resolved;
  } catch {
    // Fallback unten
  }
  return "de-DE";
}

function formatWeekdayLabel(index, locale) {
  const safeIndex = Number.isInteger(index) ? index : 0;
  const baseSunday = new Date(Date.UTC(1970, 0, 4)); // 1970-01-04 ist ein Sonntag
  const d = new Date(baseSunday.getTime());
  d.setUTCDate(baseSunday.getUTCDate() + safeIndex);
  try {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return formatter.format(d);
  } catch {
    // Fallback: einfache deutsche Kürzel
    const fallback = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    return fallback[safeIndex] || String(safeIndex);
  }
}

export function getRepeatDescription(skeet, localeOverride) {
  const locale = resolveLocale(localeOverride);
  if (!skeet.repeat || skeet.repeat === "none") {
    return `Wird gepostet um: ${formatTime(skeet.scheduledAt)}`;
  }

  if (skeet.repeat === "daily") {
    return `Wird täglich um ${formatTime(skeet.scheduledAt, "timeOnly")} gepostet`;
  }

  if (skeet.repeat === "weekly") {
    let rawDays = []
    if (
      Array.isArray(skeet.repeatDaysOfWeek) &&
      skeet.repeatDaysOfWeek.length
    ) {
      rawDays = skeet.repeatDaysOfWeek
    } else if (typeof skeet.repeatDaysOfWeek === "string") {
      try {
        const parsed = JSON.parse(skeet.repeatDaysOfWeek)
        if (Array.isArray(parsed) && parsed.length) {
          rawDays = parsed
        }
      } catch {
        // ignorieren, Fallback unten
      }
    }
    if (
      (!Array.isArray(rawDays) || !rawDays.length) &&
      skeet.repeatDayOfWeek != null
    ) {
      rawDays = [skeet.repeatDayOfWeek]
    }

    const normalizedDays = Array.from(
      new Set(
        rawDays
          .map(v => Number(v))
          .filter(v => Number.isInteger(v) && v >= 0 && v <= 6)
      )
    ).sort((a, b) => a - b);

    if (!normalizedDays.length) {
      return `Wird wöchentlich um ${formatTime(skeet.scheduledAt, "timeOnly")} gepostet`;
    }

    const dayLabel = normalizedDays
      .map(index => formatWeekdayLabel(index, locale))
      .join(", ");

    return `Wird wöchentlich am ${dayLabel} um ${formatTime(skeet.scheduledAt, "timeOnly")} gepostet`;
  }

  if (skeet.repeat === "monthly") {
    return `Wird monatlich am ${skeet.repeatDayOfMonth}. um ${formatTime(skeet.scheduledAt, "timeOnly")} gepostet`;
  }

  return "";
}

export function getDefaultDateParts() {
  const now = new Date();
  now.setDate(now.getDate() + 1); // auf morgen setzen
  now.setHours(9, 0, 0, 0); // 09:00 Uhr morgens

  const date = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const time = now.toTimeString().slice(0, 5); // "HH:mm"

  return { date, time };
}
