// src/utils/formatTime.js
const TIME_ZONE = import.meta.env.VITE_TIME_ZONE || "Europe/Berlin";

export function formatTime(utcDateString) {
  const date = new Date(utcDateString);
  return date.toLocaleString("de-DE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
