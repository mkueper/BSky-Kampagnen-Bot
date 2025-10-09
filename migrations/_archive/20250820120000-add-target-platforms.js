"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("Skeets");

    if (!columns.targetPlatforms) {
      await queryInterface.addColumn("Skeets", "targetPlatforms", {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '["bluesky"]',
      });
    }

    if (!columns.platformResults) {
      await queryInterface.addColumn("Skeets", "platformResults", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable("Skeets");

    if (columns.platformResults) {
      await queryInterface.removeColumn("Skeets", "platformResults");
    }

    if (columns.targetPlatforms) {
      await queryInterface.removeColumn("Skeets", "targetPlatforms");
    }
  },
};

