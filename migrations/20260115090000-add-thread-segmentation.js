"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Threads erweitern
    await queryInterface.changeColumn("Threads", "title", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Threads", "scheduledAt", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn("Threads", "status", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "draft",
    });

    await queryInterface.addColumn("Threads", "targetPlatforms", {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: JSON.stringify(["bluesky"]),
    });

    await queryInterface.addColumn("Threads", "appendNumbering", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn("Threads", "metadata", {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: JSON.stringify({}),
    });

    await queryInterface.addColumn("Threads", "updatedAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });

    // ThreadSkeets
    await queryInterface.createTable("ThreadSkeets", {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      threadId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Threads", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sequence: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      content: { type: Sequelize.TEXT, allowNull: false },
      appendNumbering: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      characterCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      postedAt: { type: Sequelize.DATE, allowNull: true },
      remoteId: { type: Sequelize.STRING, allowNull: true },
      platformPayload: { type: Sequelize.JSON, allowNull: false, defaultValue: JSON.stringify({}) },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.addIndex("ThreadSkeets", ["threadId", "sequence"], {
      unique: true,
      name: "threadSkeets_thread_sequence_unique",
    });

    await queryInterface.addIndex("ThreadSkeets", ["remoteId"], {
      unique: false,
      name: "threadSkeets_remoteId_idx",
    });

    // SkeetReactions
    await queryInterface.createTable("SkeetReactions", {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      threadSkeetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "ThreadSkeets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: { type: Sequelize.STRING, allowNull: false, defaultValue: "reply" },
      authorHandle: { type: Sequelize.STRING, allowNull: true },
      authorDisplayName: { type: Sequelize.STRING, allowNull: true },
      content: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: false, defaultValue: JSON.stringify({}) },
      fetchedAt: { type: Sequelize.DATE, allowNull: true },
      remoteId: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.addIndex("SkeetReactions", ["threadSkeetId"], {
      name: "skeetReactions_threadSkeet_idx",
    });

    await queryInterface.addIndex("SkeetReactions", ["remoteId"], {
      name: "skeetReactions_remoteId_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("SkeetReactions", "skeetReactions_threadSkeet_idx");
    await queryInterface.removeIndex("SkeetReactions", "skeetReactions_remoteId_idx");
    await queryInterface.dropTable("SkeetReactions");

    await queryInterface.removeIndex("ThreadSkeets", "threadSkeets_thread_sequence_unique");
    await queryInterface.removeIndex("ThreadSkeets", "threadSkeets_remoteId_idx");
    await queryInterface.dropTable("ThreadSkeets");

    await queryInterface.removeColumn("Threads", "metadata");
    await queryInterface.removeColumn("Threads", "appendNumbering");
    await queryInterface.removeColumn("Threads", "targetPlatforms");
    await queryInterface.removeColumn("Threads", "status");
    await queryInterface.removeColumn("Threads", "scheduledAt");
    await queryInterface.removeColumn("Threads", "updatedAt");

    await queryInterface.changeColumn("Threads", "title", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
