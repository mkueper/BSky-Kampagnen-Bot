// src/models/replyModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Reply = sequelize.define('Reply', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  skeetId: { type: DataTypes.INTEGER, allowNull: false },
  authorHandle: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

module.exports = Reply;
