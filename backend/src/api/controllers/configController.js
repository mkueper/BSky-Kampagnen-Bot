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
    const { values: clientAppSettings } = await settingsService.getClientAppSettings().catch(() => ({ values: {} }));
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

    // Standard-Zeitzone und Locale aus den allgemeinen Settings ermitteln (falls gesetzt),
    // ansonsten auf die Konfiguration zurückfallen.
    let timeZone = config.TIME_ZONE;
    let locale = config.LOCALE;
    let overviewPreviewMaxLines = 6;
    let overviewPreviewShowMedia = true;
    let overviewPreviewShowLinkPreview = true;
    try {
      const general = await settingsService.getGeneralSettings();
      if (general?.values?.timeZone) {
        timeZone = general.values.timeZone;
      }
      if (general?.values?.locale) {
        locale = general.values.locale;
      }
      if (general?.values?.overviewPreviewMaxLines != null) {
        overviewPreviewMaxLines = general.values.overviewPreviewMaxLines;
      }
      if (general?.values?.overviewPreviewShowMedia != null) {
        overviewPreviewShowMedia = general.values.overviewPreviewShowMedia;
      }
      if (general?.values?.overviewPreviewShowLinkPreview != null) {
        overviewPreviewShowLinkPreview =
          general.values.overviewPreviewShowLinkPreview;
      }
    } catch {
      // Fallback: config-Werte verwenden, wenn allgemeine Settings nicht gelesen werden können.
    }

    const normalizeLocale = (value) => {
      if (!value || typeof value !== "string") return "de";
      const lower = value.toLowerCase();
      if (lower.startsWith("en")) return "en";
      if (lower.startsWith("de")) return "de";
      return "de";
    };

    res.json({
      polling,
      images: config.CLIENT_CONFIG?.images || { maxCount: 4, maxBytes: 8 * 1024 * 1024, allowedMimes: ['image/jpeg','image/png','image/webp','image/gif'], requireAltText: false },
      locale: normalizeLocale(locale),
      timeZone,
      needsCredentials,
      previewProxyUrl: clientAppSettings?.previewProxyUrl || '',
      overview: {
        previewMaxLines: overviewPreviewMaxLines,
        showPreviewMedia: overviewPreviewShowMedia,
        showPreviewLinkPreview: overviewPreviewShowLinkPreview
      },
      platforms: {
        mastodonConfigured: Boolean(hasMastodonCredentials())
      },
      gifs: {
        tenorAvailable: Boolean((process.env.TENOR_API_KEY || process.env.VITE_TENOR_API_KEY || '').trim())
      },
      search: {
        advancedPrefixes: config.CLIENT_CONFIG?.search?.advancedPrefixes || [],
        prefixHints: config.CLIENT_CONFIG?.search?.prefixHints || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Laden der Client-Konfiguration.' });
  }
}

module.exports = { getClientConfig };
