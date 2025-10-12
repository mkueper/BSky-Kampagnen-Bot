// src/models/threadSkeetModel.js
/**
 * ThreadSkeet-Modell: repräsentiert einen einzelnen Beitrag innerhalb eines
 * Threads. Enthält Sequenz, formatierte Inhalte sowie Veröffentlichungsdaten,
 * sobald der Skeet live ist.
 */
module.exports = (sequelize, DataTypes) => {
  const ThreadSkeet = sequelize.define(
    "ThreadSkeet",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      threadId: { type: DataTypes.INTEGER, allowNull: false },
      sequence: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      content: { type: DataTypes.TEXT, allowNull: false },
      appendNumbering: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      characterCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      postedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      remoteId: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      platformPayload: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: () => ({}),
      },
    },
    {
      tableName: "ThreadSkeets",
      timestamps: true,
      indexes: [
        {
          fields: ["threadId", "sequence"],
          unique: true,
        },
        {
          fields: ["remoteId"],
        },
      ],
    }
  );

  return ThreadSkeet;
};
