// src/models/replyModel.js
/**
 * Reply-Modell repräsentiert Antworten, die wir zu einem Skeet abrufen.
 *
 * Replies können aus verschiedenen Plattformen stammen; wir speichern sie
 * normalized für das Dashboard.
*/
module.exports = (sequelize, DataTypes) => {
  const Reply = sequelize.define(
    "Reply",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      skeetId: { type: DataTypes.INTEGER, allowNull: false },
      authorHandle: { type: DataTypes.STRING, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      platform: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "Replies",
      timestamps: true, // createdAt/updatedAt automatisch
      underscored: false, // könnte auf true, falls snake_case gewünscht
    }
  );

  return Reply;
};
