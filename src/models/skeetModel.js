// src/models/skeetModel.js
/**
 * zentrale Tabelle für geplante bzw. veröffentlichte Skeets.
 *
 * Enthält sowohl Scheduling-Metadaten als auch Tracking-Felder wie postUri,
 * Likes/Reposts und Zielplattformen. Zusätzliche Model-Validierungen verhindern
 * unvollständige Daten (z. B. fehlende Terminangaben bei einmaligen Posts).
 */
module.exports = (sequelize, DataTypes) => {
  const ALLOWED_PLATFORMS = ["bluesky", "mastodon"];

  const Skeet = sequelize.define(
    "Skeet",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      content: { type: DataTypes.TEXT, allowNull: false },
      scheduledAt: { type: DataTypes.DATE, allowNull: true }, // <= jetzt nullable
      postUri: { type: DataTypes.STRING },
      likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      repostsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      postedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
      repeat: { type: DataTypes.ENUM("none", "daily", "weekly", "monthly"), defaultValue: "none" },
      repeatDayOfWeek: { type: DataTypes.INTEGER, allowNull: true }, // 0–6
      repeatDayOfMonth: { type: DataTypes.INTEGER, allowNull: true }, // 1–31
      threadId: { type: DataTypes.INTEGER, allowNull: true },
      isThreadPost: { type: DataTypes.BOOLEAN, defaultValue: false },
      targetPlatforms: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: ["bluesky"],
      },
      platformResults: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: "Skeets",
      timestamps: true,
      validate: {
        scheduledRequirement() {
          if (this.repeat === "none" && !this.scheduledAt && !this.postUri) {
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
        targetPlatformsNotEmpty() {
          const value = Array.isArray(this.targetPlatforms) ? this.targetPlatforms : [];
          if (value.length === 0) {
            throw new Error("targetPlatforms darf nicht leer sein.");
          }
        },
        targetPlatformsAllowed() {
          const value = Array.isArray(this.targetPlatforms) ? this.targetPlatforms : [];
          const invalid = value.filter((p) => !ALLOWED_PLATFORMS.includes(p));
          if (invalid.length > 0) {
            throw new Error(`Ungültige Plattform(en): ${invalid.join(", ")}`);
          }
        },
      },
    }
  );

  return Skeet;
};
