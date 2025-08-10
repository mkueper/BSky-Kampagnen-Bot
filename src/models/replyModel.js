// src/models/replyModel.js
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
      underscored: false, // oder true, wenn du snake_case willst
    }
  );

  return Reply;
};
