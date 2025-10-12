// migrations/20250810101350-baseline-init.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // THREADS
    await queryInterface.createTable('Threads', {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      title: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // SKEETS
    await queryInterface.createTable('Skeets', {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      content: { type: Sequelize.TEXT, allowNull: false },
      scheduledAt: { type: Sequelize.DATE, allowNull: true },
      postUri: { type: Sequelize.STRING, allowNull: true },
      likesCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      repostsCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      postedAt: { type: Sequelize.DATE, allowNull: true, defaultValue: null },

      // ENUM('none','daily','weekly','monthly') -> als STRING speichern
      repeat: { type: Sequelize.STRING, allowNull: false, defaultValue: 'none' },
      repeatDayOfWeek: { type: Sequelize.INTEGER, allowNull: true },   // 0–6
      repeatDayOfMonth: { type: Sequelize.INTEGER, allowNull: true },  // 1–31

      threadId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Threads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      isThreadPost: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('Skeets', ['scheduledAt']);
    await queryInterface.addIndex('Skeets', ['threadId']);

    // REPLIES
    await queryInterface.createTable('Replies', {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      skeetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Skeets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      authorHandle: { type: Sequelize.STRING, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('Replies', ['skeetId']);

    // (Optional) Soft-Check für repeat-Werte – SQLite kann keine ENUM-Constraints leicht per ALTER hinzufügen.
    // Wenn du es STRICT willst, könnten wir Trigger basteln. Für jetzt: App-seitig validieren (Model.validate).
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Replies');
    await queryInterface.dropTable('Skeets');
    await queryInterface.dropTable('Threads');
    // Kein ENUM-Cleanup nötig für SQLite
  },
};

