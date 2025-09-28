// src/models/threadModel.js
/**
 * Thread-Modell: gruppiert mehrere Skeets zu einem redaktionellen Faden.
 *
 * Aktuell sehr schlank – dient vor allem als Container, um geplante Posts
 * zeitlich oder thematisch zusammenzufassen.
 */
const THREAD_STATUS = ["draft", "scheduled", "publishing", "published", "failed", "deleted"];

module.exports = (sequelize, DataTypes) => {
  const Thread = sequelize.define(
    "Thread",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "draft",
        validate: {
          isIn: {
            args: [THREAD_STATUS],
            msg: "Ungültiger Thread-Status.",
          },
        },
      },
      targetPlatforms: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: () => ["bluesky"],
      },
      appendNumbering: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: () => ({}),
      },
    },
    {
      tableName: "Threads",
      timestamps: true,
      paranoid: false,
    }
  );

  Thread.STATUS = THREAD_STATUS;

  return Thread;
};
