// src/data/models/postSendLogModel.js
module.exports = (sequelize, DataTypes) => {
  const PostSendLog = sequelize.define(
    "PostSendLog",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      skeetId: { type: DataTypes.INTEGER, allowNull: false },
      platform: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false },
      postedAt: { type: DataTypes.DATE, allowNull: false },
      errorCode: { type: DataTypes.STRING, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      postUri: { type: DataTypes.STRING, allowNull: true },
      attempt: { type: DataTypes.INTEGER, allowNull: true },
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

