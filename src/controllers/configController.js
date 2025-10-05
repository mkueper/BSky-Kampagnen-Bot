// src/controllers/configController.js
const config = require('../config');

function getClientConfig(req, res) {
  // Nur lesbare, nicht-sensitive Werte exponieren
  res.json({
    polling: config.CLIENT_CONFIG?.polling || {},
    locale: config.LOCALE,
    timeZone: config.TIME_ZONE,
  });
}

module.exports = { getClientConfig };

