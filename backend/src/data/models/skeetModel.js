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
  const SCHEDULE_REQUIRED_STATUSES = new Set(["scheduled", "pending_manual", "draft", "error"]);

  const normalizePlatforms = (value) => {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const Skeet = sequelize.define(
    "Skeet",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      content: { type: DataTypes.TEXT, allowNull: false },
      /**
       * Status-Semantik (STRING, kein ENUM):
       * - draft         – Entwurf im Dashboard (noch nicht aktiv für den Scheduler)
       * - scheduled     – normal geplant, kann automatisch gepostet werden
       * - sent          – erfolgreich gesendet
       * - pending_manual – war fällig, als der Scheduler nicht aktiv war → benötigt manuelle Freigabe
       * - skipped       – vom User verworfen
       * - error         – Veröffentlichung fehlgeschlagen (optional)
       */
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "scheduled",
      },
      pendingReason: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      scheduledAt: { type: DataTypes.DATE, allowNull: true }, // <= jetzt nullable
      scheduledPlannedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
      repeatAnchorAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
      postUri: { type: DataTypes.STRING },
      likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      repostsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      postedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
      repeat: { type: DataTypes.ENUM("none", "daily", "weekly", "monthly"), defaultValue: "none" },
      repeatDayOfWeek: { type: DataTypes.INTEGER, allowNull: true }, // 0–6
      repeatDayOfMonth: { type: DataTypes.INTEGER, allowNull: true }, // 1–31
      // optionale Liste mehrerer Wochentage (0–6), z. B. für Mo/Mi/Fr-Serien
      repeatDaysOfWeek: { type: DataTypes.JSON, allowNull: true, defaultValue: null },
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
      paranoid: true,
      validate: {
        scheduledRequirement() {
          const rawStatus = typeof this.status === 'string' ? this.status : 'scheduled';
          const requiresSchedule = SCHEDULE_REQUIRED_STATUSES.has(rawStatus);
          if (requiresSchedule && this.repeat === "none" && !this.scheduledAt && !this.postUri) {
            throw new Error("scheduledAt ist erforderlich, wenn repeat = 'none' ist.");
          }
        },
        weeklyRequirement() {
          if (this.repeat !== "weekly") return;

          const raw = this.repeatDaysOfWeek;
          const list = Array.isArray(raw) ? raw : [];
          const normalized = Array.from(
            new Set(
              list
                .map(v => Number(v))
                .filter(v => Number.isInteger(v) && v >= 0 && v <= 6)
            )
          );

          const hasMulti = normalized.length > 0;
          const single =
            this.repeatDayOfWeek != null ? Number(this.repeatDayOfWeek) : null;
          const hasSingle =
            Number.isInteger(single) && single >= 0 && single <= 6;

          if (!hasMulti && !hasSingle) {
            throw new Error(
              "Mindestens ein gültiger Wochentag ist erforderlich, wenn repeat = 'weekly' ist."
            );
          }
        },
        monthlyRequirement() {
          if (this.repeat === "monthly" && this.repeatDayOfMonth == null) {
            throw new Error("repeatDayOfMonth ist erforderlich, wenn repeat = 'monthly' ist.");
          }
        },
        targetPlatformsNotEmpty() {
          const value = normalizePlatforms(this.targetPlatforms);
          if (value.length === 0) {
            throw new Error("targetPlatforms darf nicht leer sein.");
          }
        },
        targetPlatformsAllowed() {
          const value = normalizePlatforms(this.targetPlatforms);
          const invalid = value.filter((p) => !ALLOWED_PLATFORMS.includes(p));
          if (invalid.length > 0) {
            throw new Error(`Ungültige Plattform(en): ${invalid.join(", ")}`);
          }
        },
      },
      hooks: {
        beforeValidate(instance) {
          const value = normalizePlatforms(instance.targetPlatforms);
          if (value.length > 0) {
            instance.setDataValue('targetPlatforms', value);
          }
        },
        beforeSave(instance) {
          const value = normalizePlatforms(instance.targetPlatforms);
          instance.setDataValue('targetPlatforms', value);
        },
      },
    }
  );

  return Skeet;
};
