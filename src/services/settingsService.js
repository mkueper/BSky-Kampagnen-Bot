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

// Client-Polling-Konfigurationsschlüssel (werden an das Dashboard exponiert)
const CLIENT_KEYS = {
  threadActiveMs: "THREAD_POLL_ACTIVE_MS",
  threadIdleMs: "THREAD_POLL_IDLE_MS",
  threadHiddenMs: "THREAD_POLL_HIDDEN_MS",
  threadMinimalHidden: "THREAD_POLL_MINIMAL_HIDDEN",

  skeetActiveMs: "SKEET_POLL_ACTIVE_MS",
  skeetIdleMs: "SKEET_POLL_IDLE_MS",
  skeetHiddenMs: "SKEET_POLL_HIDDEN_MS",
  skeetMinimalHidden: "SKEET_POLL_MINIMAL_HIDDEN",

  backoffStartMs: "POLL_BACKOFF_START_MS",
  backoffMaxMs: "POLL_BACKOFF_MAX_MS",
  jitterRatio: "POLL_JITTER_RATIO",
  heartbeatMs: "POLL_HEARTBEAT_MS",
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

function toBool(value, fallback) {
  if (value == null) return fallback;
  const s = String(value).toLowerCase().trim();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return fallback;
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

// --- Client-Polling: Lesen/Speichern --------------------------------------

async function getClientPollingSettings() {
  const map = await getSettingsMap(Object.values(CLIENT_KEYS));
  const base = require("../config").CLIENT_CONFIG?.polling || {};

  const defaults = {
    threadActiveMs: toNumber(base?.threads?.activeMs, 8000),
    threadIdleMs: toNumber(base?.threads?.idleMs, 40000),
    threadHiddenMs: toNumber(base?.threads?.hiddenMs, 180000),
    threadMinimalHidden: Boolean(base?.threads?.minimalHidden),

    skeetActiveMs: toNumber(base?.skeets?.activeMs, 8000),
    skeetIdleMs: toNumber(base?.skeets?.idleMs, 40000),
    skeetHiddenMs: toNumber(base?.skeets?.hiddenMs, 180000),
    skeetMinimalHidden: Boolean(base?.skeets?.minimalHidden),

    backoffStartMs: toNumber(base?.backoffStartMs, 10000),
    backoffMaxMs: toNumber(base?.backoffMaxMs, 300000),
    jitterRatio: toNumber(base?.jitterRatio, 0.15),
    heartbeatMs: toNumber(base?.heartbeatMs, 2000),
  };

  const values = {
    threadActiveMs: toNumber(map[CLIENT_KEYS.threadActiveMs], defaults.threadActiveMs),
    threadIdleMs: toNumber(map[CLIENT_KEYS.threadIdleMs], defaults.threadIdleMs),
    threadHiddenMs: toNumber(map[CLIENT_KEYS.threadHiddenMs], defaults.threadHiddenMs),
    threadMinimalHidden: toBool(map[CLIENT_KEYS.threadMinimalHidden], defaults.threadMinimalHidden),

    skeetActiveMs: toNumber(map[CLIENT_KEYS.skeetActiveMs], defaults.skeetActiveMs),
    skeetIdleMs: toNumber(map[CLIENT_KEYS.skeetIdleMs], defaults.skeetIdleMs),
    skeetHiddenMs: toNumber(map[CLIENT_KEYS.skeetHiddenMs], defaults.skeetHiddenMs),
    skeetMinimalHidden: toBool(map[CLIENT_KEYS.skeetMinimalHidden], defaults.skeetMinimalHidden),

    backoffStartMs: toNumber(map[CLIENT_KEYS.backoffStartMs], defaults.backoffStartMs),
    backoffMaxMs: toNumber(map[CLIENT_KEYS.backoffMaxMs], defaults.backoffMaxMs),
    jitterRatio: (() => {
      const n = Number(map[CLIENT_KEYS.jitterRatio]);
      return Number.isFinite(n) && n >= 0 && n <= 1 ? n : defaults.jitterRatio;
    })(),
    heartbeatMs: toNumber(map[CLIENT_KEYS.heartbeatMs], defaults.heartbeatMs),
  };

  const overrides = Object.fromEntries(
    Object.entries(CLIENT_KEYS).map(([alias, key]) => [alias, map[key] ?? null])
  );

  return { values, defaults, overrides };
}

function validateClientPollingInput(v) {
  const positive = [
    v.threadActiveMs,
    v.threadIdleMs,
    v.threadHiddenMs,
    v.skeetActiveMs,
    v.skeetIdleMs,
    v.skeetHiddenMs,
    v.backoffStartMs,
    v.backoffMaxMs,
    v.heartbeatMs,
  ];
  if (positive.some((x) => !Number.isFinite(Number(x)) || Number(x) < 0)) {
    throw new Error("Polling-Intervalle und Backoff-Werte müssen positive Zahlen sein.");
  }
  const jr = Number(v.jitterRatio);
  if (!(Number.isFinite(jr) && jr >= 0 && jr <= 1)) {
    throw new Error("POLL_JITTER_RATIO muss zwischen 0 und 1 liegen.");
  }
}

async function saveClientPollingSettings(payload = {}) {
  const { values, defaults } = await getClientPollingSettings();
  const next = {
    threadActiveMs: payload.threadActiveMs ?? values.threadActiveMs,
    threadIdleMs: payload.threadIdleMs ?? values.threadIdleMs,
    threadHiddenMs: payload.threadHiddenMs ?? values.threadHiddenMs,
    threadMinimalHidden: payload.threadMinimalHidden ?? values.threadMinimalHidden,

    skeetActiveMs: payload.skeetActiveMs ?? values.skeetActiveMs,
    skeetIdleMs: payload.skeetIdleMs ?? values.skeetIdleMs,
    skeetHiddenMs: payload.skeetHiddenMs ?? values.skeetHiddenMs,
    skeetMinimalHidden: payload.skeetMinimalHidden ?? values.skeetMinimalHidden,

    backoffStartMs: payload.backoffStartMs ?? values.backoffStartMs,
    backoffMaxMs: payload.backoffMaxMs ?? values.backoffMaxMs,
    jitterRatio: payload.jitterRatio ?? values.jitterRatio,
    heartbeatMs: payload.heartbeatMs ?? values.heartbeatMs,
  };

  validateClientPollingInput(next);

  await Promise.all([
    setSetting(CLIENT_KEYS.threadActiveMs, next.threadActiveMs, defaults.threadActiveMs),
    setSetting(CLIENT_KEYS.threadIdleMs, next.threadIdleMs, defaults.threadIdleMs),
    setSetting(CLIENT_KEYS.threadHiddenMs, next.threadHiddenMs, defaults.threadHiddenMs),
    setSetting(CLIENT_KEYS.threadMinimalHidden, next.threadMinimalHidden, defaults.threadMinimalHidden),

    setSetting(CLIENT_KEYS.skeetActiveMs, next.skeetActiveMs, defaults.skeetActiveMs),
    setSetting(CLIENT_KEYS.skeetIdleMs, next.skeetIdleMs, defaults.skeetIdleMs),
    setSetting(CLIENT_KEYS.skeetHiddenMs, next.skeetHiddenMs, defaults.skeetHiddenMs),
    setSetting(CLIENT_KEYS.skeetMinimalHidden, next.skeetMinimalHidden, defaults.skeetMinimalHidden),

    setSetting(CLIENT_KEYS.backoffStartMs, next.backoffStartMs, defaults.backoffStartMs),
    setSetting(CLIENT_KEYS.backoffMaxMs, next.backoffMaxMs, defaults.backoffMaxMs),
    setSetting(CLIENT_KEYS.jitterRatio, next.jitterRatio, defaults.jitterRatio),
    setSetting(CLIENT_KEYS.heartbeatMs, next.heartbeatMs, defaults.heartbeatMs),
  ]);

  return getClientPollingSettings();
}

module.exports.getClientPollingSettings = getClientPollingSettings;
module.exports.saveClientPollingSettings = saveClientPollingSettings;
