"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("SkeetMedia", {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      skeetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Skeets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      path: { type: Sequelize.STRING, allowNull: false },
      mime: { type: Sequelize.STRING, allowNull: false },
      size: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      altText: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("SkeetMedia", ["skeetId"], { name: "skeetMedia_skeet_idx" });
    await queryInterface.addIndex("SkeetMedia", ["order"], { name: "skeetMedia_order_idx" });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex("SkeetMedia", "skeetMedia_skeet_idx");
    await queryInterface.removeIndex("SkeetMedia", "skeetMedia_order_idx");
    await queryInterface.dropTable("SkeetMedia");
  },
};

