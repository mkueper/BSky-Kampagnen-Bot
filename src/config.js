// src/config.js
require("dotenv").config();

module.exports = {
  //  SCHEDULE_TIME: "0 9 * * *", // Standard jeden Tag um 9 Uhr
  BLUESKY_SERVER: "https://bsky.social", // Standard Bluesky Server
  PORT: 3000, // Standard Port
  TIME_ZONE: process.env.VITE_TIME_ZONE || "Europe/Berlin", // Standard Zeitzone
  LOCALE: process.env.VITE_LOCALE || "de-DE", // Standard Sprache
};
