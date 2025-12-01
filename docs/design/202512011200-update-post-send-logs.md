// migrations/2025XXXXXX-update-post-send-logs.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('PostSendLogs', 'eventType', {
      type: Sequelize.ENUM('send', 'delete'),
      allowNull: false,
      defaultValue: 'send'
    });

    await queryInterface.addColumn('PostSendLogs', 'postCid', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('PostSendLogs', 'error', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('PostSendLogs', 'contentSnapshot', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('PostSendLogs', 'mediaSnapshot', {
      type: Sequelize.JSON,
      allowNull: true
    });

    await queryInterface.sequelize.query(`
      UPDATE "PostSendLogs"
      SET "eventType" = 'send'
      WHERE "eventType" IS NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE "PostSendLogs"
      SET "error" = CASE
        WHEN "errorCode" IS NOT NULL AND "errorMessage" IS NOT NULL THEN '[' || "errorCode" || '] ' || "errorMessage"
        WHEN "errorMessage" IS NOT NULL THEN "errorMessage"
        WHEN "errorCode" IS NOT NULL THEN '[' || "errorCode" || ']'
        ELSE NULL
      END
    `);

    await queryInterface.sequelize.query(`
      UPDATE "PostSendLogs"
      SET "status" = 'failed',
          "error" = COALESCE("error", 'Skipped by scheduler (config error)')
      WHERE "status" = 'skipped'
    `);

    await queryInterface.changeColumn('PostSendLogs', 'status', {
      type: Sequelize.ENUM('success', 'failed'),
      allowNull: false,
      defaultValue: 'success'
    });

    await queryInterface.removeColumn('PostSendLogs', 'errorCode');
    await queryInterface.removeColumn('PostSendLogs', 'errorMessage');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('PostSendLogs', 'errorCode', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('PostSendLogs', 'errorMessage', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.changeColumn('PostSendLogs', 'status', {
      type: Sequelize.ENUM('success', 'failed', 'skipped'),
      allowNull: false,
      defaultValue: 'success'
    });

    await queryInterface.removeColumn('PostSendLogs', 'eventType');
    await queryInterface.removeColumn('PostSendLogs', 'postCid');
    await queryInterface.removeColumn('PostSendLogs', 'error');
    await queryInterface.removeColumn('PostSendLogs', 'contentSnapshot');
    await queryInterface.removeColumn('PostSendLogs', 'mediaSnapshot');
  }
}
