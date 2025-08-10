// src/models/skeetModel.js
module.exports = (sequelize, DataTypes) => {
  const Skeet = sequelize.define(
    "Skeet",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      content: { type: DataTypes.TEXT, allowNull: false },
      scheduledAt: { type: DataTypes.DATE, allowNull: true }, // <= jetzt nullable
      postUri: { type: DataTypes.STRING },
      likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      repostsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      postedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      repeat: { type: DataTypes.ENUM("none", "daily", "weekly", "monthly"), defaultValue: "none" },
      repeatDayOfWeek: { type: DataTypes.INTEGER, allowNull: true }, // 0–6
      repeatDayOfMonth: { type: DataTypes.INTEGER, allowNull: true }, // 1–31
      threadId: { type: DataTypes.INTEGER, allowNull: true },
      isThreadPost: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "Skeets",
      timestamps: true,
      validate: {
        scheduledRequirement() {
          if (this.repeat === "none" && !this.scheduledAt) {
            throw new Error("scheduledAt ist erforderlich, wenn repeat = 'none' ist.");
          }
        },
        weeklyRequirement() {
          if (this.repeat === "weekly" && this.repeatDayOfWeek == null) {
            throw new Error("repeatDayOfWeek ist erforderlich, wenn repeat = 'weekly' ist.");
          }
        },
        monthlyRequirement() {
          if (this.repeat === "monthly" && this.repeatDayOfMonth == null) {
            throw new Error("repeatDayOfMonth ist erforderlich, wenn repeat = 'monthly' ist.");
          }
        },
      },
    }
  );

  return Skeet;
};
