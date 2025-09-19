// src/models/threadModel.js
/**
 * Thread-Modell: gruppiert mehrere Skeets zu einem redaktionellen Faden.
 *
 * Aktuell sehr schlank – dient vor allem als Container, um geplante Posts
 * zeitlich oder thematisch zusammenzufassen.
 */
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Thread",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      timestamps: false, // hier genügt ein manueller createdAt-Timestamp
      tableName: "Threads",
    }
  );
};
