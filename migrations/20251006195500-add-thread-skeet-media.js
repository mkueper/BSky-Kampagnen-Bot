"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ThreadSkeetMedia", {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      threadSkeetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "ThreadSkeets", key: "id" },
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

    await queryInterface.addIndex("ThreadSkeetMedia", ["threadSkeetId"], { name: "threadSkeetMedia_segment_idx" });
    await queryInterface.addIndex("ThreadSkeetMedia", ["order"], { name: "threadSkeetMedia_order_idx" });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("ThreadSkeetMedia", "threadSkeetMedia_segment_idx");
    await queryInterface.removeIndex("ThreadSkeetMedia", "threadSkeetMedia_order_idx");
    await queryInterface.dropTable("ThreadSkeetMedia");
  },
};

