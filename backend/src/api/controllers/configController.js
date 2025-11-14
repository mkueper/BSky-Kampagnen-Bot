/**
 * @file configController.js
 * @summary Liefert clientseitig benötigte, nicht-sensitive Konfiguration.
 *
 * Wird vom Dashboard verwendet, um Polling-Intervalle, Locale und Zeitzone
 * zu kennen. Es werden ausschließlich unkritische Werte exponiert.
 */
const config = require('@config');
const settingsService = require('@core/services/settingsService');
const { hasCredentials: hasMastodonCredentials } = require('@core/services/mastodonClient');

async function getClientConfig(req, res) {
  try {
    const base = config.CLIENT_CONFIG?.polling || {};
    // DB-Overrides für Client-Polling lesen und auf Base mappen
    const { values } = await settingsService.getClientPollingSettings().catch(() => ({ values: null }));
    const polling = {
      skeets: {
        activeMs: values?.skeetActiveMs ?? base?.skeets?.activeMs,
        idleMs: values?.skeetIdleMs ?? base?.skeets?.idleMs,
        hiddenMs: values?.skeetHiddenMs ?? base?.skeets?.hiddenMs,
        minimalHidden: values?.skeetMinimalHidden ?? base?.skeets?.minimalHidden,
      },
      threads: {
        activeMs: values?.threadActiveMs ?? base?.threads?.activeMs,
        idleMs: values?.threadIdleMs ?? base?.threads?.idleMs,
        hiddenMs: values?.threadHiddenMs ?? base?.threads?.hiddenMs,
        minimalHidden: values?.threadMinimalHidden ?? base?.threads?.minimalHidden,
      },
      backoffStartMs: values?.backoffStartMs ?? base?.backoffStartMs,
      backoffMaxMs: values?.backoffMaxMs ?? base?.backoffMaxMs,
      jitterRatio: values?.jitterRatio ?? base?.jitterRatio,
      heartbeatMs: values?.heartbeatMs ?? base?.heartbeatMs,
    };

    const needsCredentials = !(
      String(process.env.BLUESKY_IDENTIFIER || '').trim() &&
      String(process.env.BLUESKY_APP_PASSWORD || '').trim()
    );

    res.json({
      polling,
      images: config.CLIENT_CONFIG?.images || { maxCount: 4, maxBytes: 8 * 1024 * 1024, allowedMimes: ['image/jpeg','image/png','image/webp','image/gif'], requireAltText: false },
      locale: config.LOCALE,
      timeZone: config.TIME_ZONE,
      needsCredentials,
      platforms: {
        mastodonConfigured: Boolean(hasMastodonCredentials())
      },
      gifs: {
        tenorAvailable: Boolean((process.env.TENOR_API_KEY || process.env.VITE_TENOR_API_KEY || '').trim())
      },
      ui: {
        quickComposer: {
          enabled: config.CLIENT_CONFIG?.ui?.quickComposer?.enabled !== false
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Client-Konfiguration.' });
  }
}

module.exports = { getClientConfig };
