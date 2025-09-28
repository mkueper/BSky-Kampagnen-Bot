"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Skeets", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addIndex("Skeets", ["deletedAt"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Skeets", ["deletedAt"]);
    await queryInterface.removeColumn("Skeets", "deletedAt");
  },
};
