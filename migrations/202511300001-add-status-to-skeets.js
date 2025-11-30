"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Neue Spalte: status
    await queryInterface.addColumn("Skeets", "status", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "scheduled",
    });

    // Optionaler Grund für Pending-Status
    await queryInterface.addColumn("Skeets", "pendingReason", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });

    // Bestehende Datensätze auf sinnvolle Status setzen
    // 1) Bereits veröffentlichte Skeets -> sent
    await queryInterface.sequelize.query(`
      UPDATE "Skeets"
      SET status = 'sent'
      WHERE postedAt IS NOT NULL
    `);

    // 2) Geplante Skeets (mit Termin, aber noch nicht gepostet) -> scheduled
    await queryInterface.sequelize.query(`
      UPDATE "Skeets"
      SET status = 'scheduled'
      WHERE postedAt IS NULL AND scheduledAt IS NOT NULL
    `);

    // 3) Skeets ohne Termin und ohne Posting -> draft
    await queryInterface.sequelize.query(`
      UPDATE "Skeets"
      SET status = 'draft'
      WHERE postedAt IS NULL AND scheduledAt IS NULL
    `);
  },

  async down(queryInterface /*, Sequelize */) {
    await queryInterface.removeColumn("Skeets", "pendingReason");
    await queryInterface.removeColumn("Skeets", "status");
  },
};

