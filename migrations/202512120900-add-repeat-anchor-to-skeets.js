module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable("Skeets").catch(() => ({}));
    if (!tableDefinition.repeatAnchorAt) {
      await queryInterface.addColumn("Skeets", "repeatAnchorAt", {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }
    await queryInterface.sequelize.query(`
      UPDATE "Skeets"
      SET "repeatAnchorAt" = "scheduledAt"
      WHERE "repeat" IS NOT NULL
        AND "repeat" <> 'none'
        AND "repeatAnchorAt" IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Skeets", "repeatAnchorAt").catch(() => {});
  },
};
