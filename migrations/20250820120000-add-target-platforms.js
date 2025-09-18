"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Skeets", "targetPlatforms", {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: '["bluesky"]',
    });

    await queryInterface.addColumn("Skeets", "platformResults", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Skeets", "platformResults");
    await queryInterface.removeColumn("Skeets", "targetPlatforms");
  },
};
