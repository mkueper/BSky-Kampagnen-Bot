// src/models/threadModel.js
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
      timestamps: false, // wir nutzen nur createdAt
      tableName: "Threads",
    }
  );
};
