// src/models/db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './data/bluesky_campaign.sqlite',
  logging: false
});

module.exports = sequelize;

