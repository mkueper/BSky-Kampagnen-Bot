// src/models/threadSkeetMediaModel.js
module.exports = (sequelize, DataTypes) => {
  const ThreadSkeetMedia = sequelize.define(
    'ThreadSkeetMedia',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      threadSkeetId: { type: DataTypes.INTEGER, allowNull: false },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      path: { type: DataTypes.STRING, allowNull: false },
      mime: { type: DataTypes.STRING, allowNull: false },
      size: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      altText: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: 'ThreadSkeetMedia',
      timestamps: true,
      indexes: [
        { fields: ['threadSkeetId'] },
        { fields: ['order'] },
      ],
    }
  );

  return ThreadSkeetMedia;
};

