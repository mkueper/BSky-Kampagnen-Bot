// src/data/models/postSendLogModel.js
module.exports = (sequelize, DataTypes) => {
  const PostSendLog = sequelize.define(
    "PostSendLog",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      skeetId: { type: DataTypes.INTEGER, allowNull: false },
      platform: { type: DataTypes.STRING, allowNull: false },
      eventType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'send',
        validate: {
          isIn: [['send', 'delete']]
        }
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'success',
        validate: {
          isIn: [['success', 'failed', 'skipped']]
        }
      },
      postedAt: { type: DataTypes.DATE, allowNull: false },
      postUri: { type: DataTypes.STRING, allowNull: true },
      postCid: { type: DataTypes.STRING, allowNull: true },
      attempt: { type: DataTypes.INTEGER, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
      contentSnapshot: { type: DataTypes.TEXT, allowNull: true },
      mediaSnapshot: { type: DataTypes.JSON, allowNull: true },
    },
    {
      tableName: "PostSendLogs",
      timestamps: true,
    }
  );

  PostSendLog.associate = (models) => {
    PostSendLog.belongsTo(models.Skeet, { foreignKey: "skeetId", as: "skeet" });
  };

  return PostSendLog;
};
