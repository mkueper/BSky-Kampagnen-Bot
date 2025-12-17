const DEFAULT_TRUTHY = ['1', 'true', 'yes'];

function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * Ließt einen Bool-Query-Parameter robust aus.
 * @param {import('express').Request} req
 * @param {string} key
 * @param {{ allowAllToken?: string, defaultValue?: boolean, truthyValues?: string[] }} options
 * @returns {boolean}
 */
function getBooleanQueryFlag(req, key, { allowAllToken, defaultValue = false, truthyValues } = {}) {
  const param = normalize(req?.query?.[key]);
  if (!param) return defaultValue;
  const truthy = Array.isArray(truthyValues) && truthyValues.length ? truthyValues : DEFAULT_TRUTHY;
  if (truthy.includes(param)) return true;
  if (allowAllToken && param === allowAllToken.toLowerCase()) return true;
  return false;
}

function matchesOne(message, patterns = []) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return patterns.some((pattern) => {
    if (!pattern) return false;
    if (pattern instanceof RegExp) {
      return pattern.test(message);
    }
    return lower.includes(String(pattern).toLowerCase());
  });
}

function resolveErrorStatus(error, {
  defaultStatus = 500,
  notFoundPatterns = [],
  badRequestPatterns = [],
} = {}) {
  const message = typeof error?.message === 'string' ? error.message : '';
  if (matchesOne(message.toLowerCase(), notFoundPatterns.map((p) => typeof p === 'string' ? p.toLowerCase() : p))) {
    return 404;
  }
  if (matchesOne(message.toLowerCase(), badRequestPatterns.map((p) => typeof p === 'string' ? p.toLowerCase() : p))) {
    return 400;
  }
  return error?.status || defaultStatus;
}

function sendControllerError(res, error, options = {}) {
  const status = resolveErrorStatus(error, options);
  const message = error?.message || options?.fallbackMessage || 'Unbekannter Fehler.';
  res.status(status).json({ error: message });
}

module.exports = {
  getBooleanQueryFlag,
  resolveErrorStatus,
  sendControllerError,
};
