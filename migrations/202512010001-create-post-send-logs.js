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

      // NEU: Event-Typ (send oder delete)
      eventType: {
        type: Sequelize.STRING,
        allowNull: false, // 'send' oder 'delete', Validierung im Model
      },

      // NEU: vereinfachter Status (success oder failed)
      status: {
        type: Sequelize.STRING,
        allowNull: false, // 'success' oder 'failed', Validierung im Model
      },

      postedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      postUri: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      // NEU: optionale CID (z.B. für ATProto)
      postCid: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      attempt: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      // NEU: zusammengeführtes Fehlerfeld
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // NEU: optionale Snapshots (aktuell noch ungenutzt)
      contentSnapshot: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      mediaSnapshot: {
        type: Sequelize.JSON,
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
