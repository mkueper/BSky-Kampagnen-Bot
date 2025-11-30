"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PostSendLogs", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      skeetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Skeets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      postedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      errorCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      postUri: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      attempt: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("PostSendLogs");
  },
};

