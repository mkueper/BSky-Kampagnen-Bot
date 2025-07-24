// src/models/db.js
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./data/bluesky_campaign.sqlite",
  logging: false,
  dialectOptions: {
    timezone: "Etc/UTC", // sorgt dafür, dass UTC gespeichert wird
  },
  define: {
    // Alle Zeitfelder automatisch in UTC verwalten
    timestamps: true,
  },
});

module.exports = sequelize;
