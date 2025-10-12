/**
 * @file configController.js
 * @summary Liefert clientseitig benötigte, nicht-sensitive Konfiguration.
 *
 * Wird vom Dashboard verwendet, um Polling-Intervalle, Locale und Zeitzone
 * zu kennen. Es werden ausschließlich unkritische Werte exponiert.
 */
const config = require('../config');
const settingsService = require('../services/settingsService');

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

    res.json({
      polling,
      images: config.CLIENT_CONFIG?.images || { maxCount: 4, maxBytes: 8 * 1024 * 1024, allowedMimes: ['image/jpeg','image/png','image/webp','image/gif'], requireAltText: false },
      locale: config.LOCALE,
      timeZone: config.TIME_ZONE,
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Client-Konfiguration.' });
  }
}

module.exports = { getClientConfig };
