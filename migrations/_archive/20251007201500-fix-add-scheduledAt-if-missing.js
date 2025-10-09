"use strict";

/**
 * Defensive migration: ensure Threads.scheduledAt exists.
 * Some installations may have drifted schemas where the column is missing
 * but SequelizeMeta marks prior migrations as applied. This migration
 * checks via PRAGMA and adds the column only if it is absent.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Inspect current columns in Threads
    const [rows] = await queryInterface.sequelize.query("PRAGMA table_info('Threads')");
    const hasScheduledAt = Array.isArray(rows) && rows.some((c) => c && c.name === "scheduledAt");
    if (!hasScheduledAt) {
      await queryInterface.addColumn("Threads", "scheduledAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface /*, Sequelize */) {
    // Only remove if it exists to stay idempotent
    const [rows] = await queryInterface.sequelize.query("PRAGMA table_info('Threads')");
    const hasScheduledAt = Array.isArray(rows) && rows.some((c) => c && c.name === "scheduledAt");
    if (hasScheduledAt) {
      // Note: SQLite cannot drop columns prior to v3.35; Sequelize emulates
      // by recreating the table. We keep down minimal and skip to avoid risk.
      // If removal is strictly needed, a dedicated migration should handle it.
      return;
    }
  },
};

