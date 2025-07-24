// src/utils/formatTime.js
const TIME_ZONE = import.meta.env.VITE_TIME_ZONE || "Europe/Berlin";
const LOCALE = import.meta.env.VITE_LOCALE || "de-DE";

export function formatTime(utcDateString, mode = "full") {
  const date = new Date(utcDateString);

  const options = {
    timeZone: TIME_ZONE,
  };

  if (mode === "timeOnly") {
    options.hour = "2-digit";
    options.minute = "2-digit";
  } else if (mode === "dateOnly") {
    options.year = "numeric";
    options.month = "2-digit";
    options.day = "2-digit";
  } else {
    // full
    options.year = "numeric";
    options.month = "2-digit";
    options.day = "2-digit";
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return date.toLocaleString(LOCALE, options);
}
