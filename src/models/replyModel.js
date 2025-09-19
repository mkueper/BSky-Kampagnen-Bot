// src/models/replyModel.js
/**
 * Reply-Modell repräsentiert Antworten, die wir zu einem Skeet abrufen.
 *
 * Da Replies ausschließlich aus Bluesky importiert werden, sind kaum eigene
 * Validierungen notwendig – wir stellen lediglich sicher, dass die Zuordnung
 * zum Skeet sowie der Author-Handle gespeichert werden.
 */
module.exports = (sequelize, DataTypes) => {
  const Reply = sequelize.define(
    "Reply",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      skeetId: { type: DataTypes.INTEGER, allowNull: false },
      authorHandle: { type: DataTypes.STRING, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
    },
    {
      tableName: "Replies",
      timestamps: true, // createdAt/updatedAt automatisch
      underscored: false, // könnte auf true, falls snake_case gewünscht
    }
  );

  return Reply;
};
