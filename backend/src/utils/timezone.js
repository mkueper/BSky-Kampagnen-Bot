const config = require("../config");

const DATETIME_LOCAL_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const formatterCache = new Map();

function getFormatter(timeZone) {
  const zone = timeZone || config.TIME_ZONE || "UTC";
  if (!formatterCache.has(zone)) {
    formatterCache.set(
      zone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }
  return formatterCache.get(zone);
}

function getTimeZoneOffset(date, timeZone) {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const lookup = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }
  const utcEquivalent = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second)
  );
  return utcEquivalent - date.getTime();
}

function zonedTimeToUtc({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  if (![year, month, day].every((value) => Number.isInteger(value))) {
    throw new Error("Ungültige Datumsbestandteile.");
  }
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const guessDate = new Date(utcGuess);
  const offset = getTimeZoneOffset(guessDate, timeZone);
  return new Date(utcGuess - offset);
}

function parseDatetimeLocal(value, timeZone = config.TIME_ZONE) {
  if (typeof value !== "string" || !DATETIME_LOCAL_REGEX.test(value)) {
    throw new Error("Ungültiges Datumsformat (erwartet YYYY-MM-DDTHH:mm).");
  }
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map((n) => Number(n));
  const [hour, minute] = timePart.split(":").map((n) => Number(n));
  return zonedTimeToUtc({ year, month, day, hour, minute, second: 0 }, timeZone);
}

module.exports = {
  parseDatetimeLocal,
  zonedTimeToUtc,
  DATETIME_LOCAL_REGEX,
};
