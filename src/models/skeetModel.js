// src/models/skeetModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("./db");

const Skeet = sequelize.define("Skeet", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  scheduledAt: { type: DataTypes.DATE, allowNull: false },
  postUri: { type: DataTypes.STRING, allowNull: true },
  likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  repostsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  postedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  repeat: {
    type: DataTypes.ENUM("none", "daily", "weekly", "monthly"),
    defaultValue: "none",
  },
  repeatDayOfWeek: {
    type: DataTypes.INTEGER, // 0=Sonntag … 6=Samstag
    allowNull: true,
  },
  repeatDayOfMonth: {
    type: DataTypes.INTEGER, // 1–31
    allowNull: true,
  },
});

module.exports = Skeet;
