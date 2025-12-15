const fs = require('fs');
const path = require('path');

const DEFAULT_CUSTOMIZATION = {
  csp: {
    mediaOrigins: [
      'https://media.tenor.com',
      'https://cdn.jsdelivr.net',
      'https://video.bsky.app',
      'https://video.cdn.bsky.app',
      'https://cdn.bsky.app'
    ]
  },
  search: {
    advancedPrefixes: [
      { id: 'from', prefix: 'from:', hint: '@handle oder „me“' },
      { id: 'mention', prefix: 'mention:', hint: '@handle oder „me“' },
      { id: 'mentions', prefix: 'mentions:', hint: '@handle oder „me“' },
      { id: 'to', prefix: 'to:', hint: '@handle oder „me“' },
      { id: 'domain', prefix: 'domain:', hint: 'example.com' },
      { id: 'lang', prefix: 'lang:', hint: 'de, en' },
      { id: 'since', prefix: 'since:', hint: 'YYYY-MM-DD' },
      { id: 'until', prefix: 'until:', hint: 'YYYY-MM-DD' }
    ]
  }
};

let cachedConfig = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeDeep(base, override) {
  const result = clone(base);
  if (!override || typeof override !== 'object') {
    return result;
  }
  for (const [key, value] of Object.entries(override)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      result[key] = value.slice();
    } else if (typeof value === 'object') {
      const baseChild = (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key]))
        ? result[key]
        : {};
      result[key] = mergeDeep(clone(baseChild), value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function loadCustomization() {
  const appRoot = process.env.APP_ROOT || process.cwd();
  const customPath = process.env.APP_CUSTOMIZATION_PATH || path.join(appRoot, 'config', 'app-customization.json');
  try {
    const raw = fs.readFileSync(customPath, 'utf8');
    const parsed = JSON.parse(raw);
    return mergeDeep(DEFAULT_CUSTOMIZATION, parsed);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('[customization] Konnte app-customization.json nicht laden:', error.message);
    }
    return clone(DEFAULT_CUSTOMIZATION);
  }
}

function getCustomization() {
  if (!cachedConfig) {
    cachedConfig = loadCustomization();
  }
  return cachedConfig;
}

module.exports = {
  getCustomization,
  DEFAULT_CUSTOMIZATION,
};
