import { formatTime } from "./formatTime.js";

export function getRepeatDescription(skeet) {
  if (!skeet.repeat || skeet.repeat === "none") {
    return `Wird gepostet um: ${formatTime(skeet.scheduledAt)}`;
  }

  if (skeet.repeat === "daily") {
    return `Wird täglich um ${formatTime(skeet.scheduledAt, "timeOnly")} gepostet`;
  }

  if (skeet.repeat === "weekly") {
    return `Wird wöchentlich am Tag ${skeet.repeatDayOfWeek} um ${formatTime(skeet.scheduledAt, "timeOnly")} gepostet`;
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

