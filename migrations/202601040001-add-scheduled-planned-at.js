module.exports = {
  async up(queryInterface, Sequelize) {
    const skeetTable = await queryInterface.describeTable("Skeets").catch(() => ({}));
    if (!skeetTable.scheduledPlannedAt) {
      await queryInterface.addColumn("Skeets", "scheduledPlannedAt", {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    const threadTable = await queryInterface.describeTable("Threads").catch(() => ({}));
    if (!threadTable.scheduledPlannedAt) {
      await queryInterface.addColumn("Threads", "scheduledPlannedAt", {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE "Skeets"
      SET "scheduledPlannedAt" = "scheduledAt"
      WHERE "scheduledPlannedAt" IS NULL
        AND "scheduledAt" IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Threads"
      SET "scheduledPlannedAt" = "scheduledAt"
      WHERE "scheduledPlannedAt" IS NULL
        AND "scheduledAt" IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Skeets", "scheduledPlannedAt").catch(() => {});
    await queryInterface.removeColumn("Threads", "scheduledPlannedAt").catch(() => {});
  },
};
