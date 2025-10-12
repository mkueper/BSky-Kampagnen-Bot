"use strict";

/**
 * Defensive migration: ensure critical columns exist on Threads.
 * Adds any of: scheduledAt, status, targetPlatforms, appendNumbering, metadata, updatedAt.
 * Uses SQLite PRAGMA inspection and only applies missing pieces.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query("PRAGMA table_info('Threads')");
    const has = (name) => Array.isArray(rows) && rows.some((c) => c && c.name === name);

    if (!has("scheduledAt")) {
      await queryInterface.addColumn("Threads", "scheduledAt", {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!has("status")) {
      await queryInterface.addColumn("Threads", "status", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "draft",
      });
    }

    if (!has("targetPlatforms")) {
      await queryInterface.addColumn("Threads", "targetPlatforms", {
        type: Sequelize.JSON,
        allowNull: true,
      });
      // Fill default separately to avoid non-constant default error in SQLite
      await queryInterface.sequelize.query(
        "UPDATE Threads SET targetPlatforms='[\"bluesky\"]' WHERE targetPlatforms IS NULL"
      );
    }

    if (!has("appendNumbering")) {
      await queryInterface.addColumn("Threads", "appendNumbering", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!has("metadata")) {
      await queryInterface.addColumn("Threads", "metadata", {
        type: Sequelize.JSON,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        "UPDATE Threads SET metadata='{}' WHERE metadata IS NULL"
      );
    }

    if (!has("updatedAt")) {
      await queryInterface.addColumn("Threads", "updatedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        "UPDATE Threads SET updatedAt=CURRENT_TIMESTAMP WHERE updatedAt IS NULL"
      );
    }
  },

  async down() {
    // No-op: we don't drop columns in defensive fix to avoid data loss and table recreation.
  },
};

