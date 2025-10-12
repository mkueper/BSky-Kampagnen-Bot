// src/models/skeetReactionModel.js
/**
 * Speichert Reaktionen (Likes, Reposts) und Antworten, die einem
 * Thread-Skeet zugeordnet sind. Replies enthalten Text, während Likes & Co.
 * vor allem Metadaten bereitstellen.
 */
module.exports = (sequelize, DataTypes) => {
  const SkeetReaction = sequelize.define(
    "SkeetReaction",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      threadSkeetId: { type: DataTypes.INTEGER, allowNull: false },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "reply",
        validate: {
          isIn: {
            args: [["reply", "quote", "like", "repost"]],
            msg: "Ungültiger Reaction-Typ",
          },
        },
      },
      authorHandle: { type: DataTypes.STRING, allowNull: true },
      authorDisplayName: { type: DataTypes.STRING, allowNull: true },
      content: { type: DataTypes.TEXT, allowNull: true },
      metadata: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: () => ({}),
      },
      fetchedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      remoteId: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      tableName: "SkeetReactions",
      timestamps: true,
      indexes: [
        {
          fields: ["threadSkeetId"],
        },
        {
          fields: ["remoteId"],
          unique: false,
        },
      ],
    }
  );

  return SkeetReaction;
};
