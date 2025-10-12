'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Spalte hinzufügen (JSON-Array als String/TEXT)
    await queryInterface.addColumn('Skeets', 'repeatDaysOfWeek', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // 2) Backfill aus altem Feld repeatDayOfWeek -> [repeatDayOfWeek]
    // (nur für weekly-Einträge; SQLite-String-Konkatenation)
    await queryInterface.sequelize.query(`
      UPDATE Skeets
      SET repeatDaysOfWeek = '[' || repeatDayOfWeek || ']'
      WHERE repeat = 'weekly'
        AND repeatDayOfWeek IS NOT NULL
        AND (repeatDaysOfWeek IS NULL OR TRIM(repeatDaysOfWeek) = '');
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Skeets', 'repeatDaysOfWeek');
  },
};

