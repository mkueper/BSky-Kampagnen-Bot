// src/models/settingModel.js
/**
 * Einfache Key-Value-Konfigurationstabelle für runtime-konfigurierbare Einstellungen.
 */
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Setting",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      value: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "Settings",
      timestamps: true,
    }
  );
};
