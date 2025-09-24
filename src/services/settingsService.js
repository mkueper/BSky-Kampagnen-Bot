const { Op } = require("sequelize");
const cron = require("node-cron");
const config = require("../config");
const { Setting } = require("../models");

const KEYS = {
  scheduleTime: "SCHEDULE_TIME",
  timeZone: "TIME_ZONE",
  postRetries: "POST_RETRIES",
  postBackoffMs: "POST_BACKOFF_MS",
  postBackoffMaxMs: "POST_BACKOFF_MAX_MS",
};

function defaults() {
  return {
    scheduleTime: config.SCHEDULE_TIME,
    timeZone: config.TIME_ZONE,
    postRetries: Number(process.env.POST_RETRIES ?? 3) || 3,
    postBackoffMs: Number(process.env.POST_BACKOFF_MS ?? 500) || 500,
    postBackoffMaxMs: Number(process.env.POST_BACKOFF_MAX_MS ?? 4000) || 4000,
  };
}

async function getSettingsMap(keys) {
  const rows = await Setting.findAll({ where: { key: { [Op.in]: keys } } });
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

function toNumber(value, fallback) {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getSchedulerSettings() {
  const allDefaults = defaults();
  const map = await getSettingsMap(Object.values(KEYS));

  const values = {
    scheduleTime: map[KEYS.scheduleTime] || allDefaults.scheduleTime,
    timeZone: map[KEYS.timeZone] || allDefaults.timeZone,
    postRetries: toNumber(map[KEYS.postRetries], allDefaults.postRetries),
    postBackoffMs: toNumber(map[KEYS.postBackoffMs], allDefaults.postBackoffMs),
    postBackoffMaxMs: toNumber(map[KEYS.postBackoffMaxMs], allDefaults.postBackoffMaxMs),
  };

  const overrides = Object.fromEntries(
    Object.entries(KEYS).map(([alias, key]) => [alias, map[key] ?? null])
  );

  return { values, defaults: allDefaults, overrides };
}

async function setSetting(key, value, defaultValue) {
  if (value == null || value === "" || String(value) === String(defaultValue)) {
    await Setting.destroy({ where: { key } });
    return;
  }
  await Setting.upsert({ key, value: String(value) });
}

function validateScheduleInput({ scheduleTime, timeZone }) {
  if (!scheduleTime || !cron.validate(scheduleTime)) {
    throw new Error("Ungültiger Cron-Ausdruck für den Scheduler.");
  }
  if (!timeZone || typeof timeZone !== "string") {
    throw new Error("TIME_ZONE muss angegeben werden.");
  }
}

function validatePostingInput({ postRetries, postBackoffMs, postBackoffMaxMs }) {
  const numbers = [postRetries, postBackoffMs, postBackoffMaxMs].map((value) => Number(value));
  if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("POST_RETRIES und Backoff-Werte müssen positive Zahlen sein.");
  }
}

async function saveSchedulerSettings(payload) {
  const { values, defaults: defaultValues } = await getSchedulerSettings();
  const nextValues = {
    scheduleTime: payload.scheduleTime ?? values.scheduleTime,
    timeZone: payload.timeZone ?? values.timeZone,
    postRetries: payload.postRetries ?? values.postRetries,
    postBackoffMs: payload.postBackoffMs ?? values.postBackoffMs,
    postBackoffMaxMs: payload.postBackoffMaxMs ?? values.postBackoffMaxMs,
  };

  validateScheduleInput(nextValues);
  validatePostingInput(nextValues);

  await Promise.all([
    setSetting(KEYS.scheduleTime, nextValues.scheduleTime, defaultValues.scheduleTime),
    setSetting(KEYS.timeZone, nextValues.timeZone, defaultValues.timeZone),
    setSetting(KEYS.postRetries, nextValues.postRetries, defaultValues.postRetries),
    setSetting(KEYS.postBackoffMs, nextValues.postBackoffMs, defaultValues.postBackoffMs),
    setSetting(KEYS.postBackoffMaxMs, nextValues.postBackoffMaxMs, defaultValues.postBackoffMaxMs),
  ]);

  return getSchedulerSettings();
}

async function getPostingConfig() {
  const { values } = await getSchedulerSettings();
  return {
    maxRetries: toNumber(values.postRetries, defaults().postRetries),
    baseMs: toNumber(values.postBackoffMs, defaults().postBackoffMs),
    maxMs: toNumber(values.postBackoffMaxMs, defaults().postBackoffMaxMs),
  };
}

module.exports = {
  getSchedulerSettings,
  saveSchedulerSettings,
  getPostingConfig,
};
