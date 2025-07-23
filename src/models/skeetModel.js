// src/models/skeetModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("./db");

const Skeet = sequelize.define("Skeet", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  postUri: { type: DataTypes.STRING, allowNull: true },
  likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  repostsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  postedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

module.exports = Skeet;
