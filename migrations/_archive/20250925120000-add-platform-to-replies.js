"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("Replies");

    if (!tableInfo.platform) {
      await queryInterface.addColumn("Replies", "platform", {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      });

      await queryInterface.sequelize.query(
        "UPDATE \"Replies\" SET \"platform\" = 'bluesky' WHERE \"platform\" IS NULL"
      );
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable("Replies");

    if (tableInfo.platform) {
      await queryInterface.removeColumn("Replies", "platform");
    }
  },
};

