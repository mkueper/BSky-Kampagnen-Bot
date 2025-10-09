'use strict';

async function tableExists(queryInterface, table) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=$table;`,
    { bind: { table } }
  );
  return rows.length > 0;
}

async function columnExists(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(`PRAGMA table_info(${table});`);
  return rows.some(r => r.name === column);
}

async function indexExists(queryInterface, table, indexName) {
  const [rows] = await queryInterface.sequelize.query(`PRAGMA index_list(${table});`);
  return rows.some(r => r.name === indexName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // --- Threads erweitern ---
    // title optional machen
    await queryInterface.changeColumn('Threads', 'title', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // scheduledAt nur hinzufügen, wenn nicht vorhanden
    if (!(await columnExists(queryInterface, 'Threads', 'scheduledAt'))) {
      await queryInterface.addColumn('Threads', 'scheduledAt', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null, // <-- richtig: defaultValue
      });
    }

    // status
    if (!(await columnExists(queryInterface, 'Threads', 'status'))) {
      await queryInterface.addColumn('Threads', 'status', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'draft',
      });
    }

    // targetPlatforms (als TEXT-JSON für SQLite)
    if (!(await columnExists(queryInterface, 'Threads', 'targetPlatforms'))) {
      await queryInterface.addColumn('Threads', 'targetPlatforms', {
        type: Sequelize.TEXT, // statt Sequelize.JSON
        allowNull: false,
        defaultValue: JSON.stringify(['bluesky']),
      });
    }

    // appendNumbering
    if (!(await columnExists(queryInterface, 'Threads', 'appendNumbering'))) {
      await queryInterface.addColumn('Threads', 'appendNumbering', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    // metadata (als TEXT-JSON)
    if (!(await columnExists(queryInterface, 'Threads', 'metadata'))) {
      await queryInterface.addColumn('Threads', 'metadata', {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: JSON.stringify({}),
      });
    }

    // updatedAt (Guard korrekt auf updatedAt)
    if (!(await columnExists(queryInterface, 'Threads', 'updatedAt'))) {
      await queryInterface.addColumn('Threads', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }

    // --- ThreadSkeets anlegen (nur wenn Tabelle fehlt) ---
    if (!(await tableExists(queryInterface, 'ThreadSkeets'))) {
      await queryInterface.createTable('ThreadSkeets', {
        id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        threadId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Threads', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        sequence: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        content: { type: Sequelize.TEXT, allowNull: false },
        appendNumbering: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        characterCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        postedAt: { type: Sequelize.DATE, allowNull: true },
        remoteId: { type: Sequelize.STRING, allowNull: true },
        platformPayload: { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify({}) },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // Indizes auf ThreadSkeets
    if (await tableExists(queryInterface, 'ThreadSkeets')) {
      if (!(await indexExists(queryInterface, 'ThreadSkeets', 'threadSkeets_thread_sequence_unique'))) {
        await queryInterface.addIndex('ThreadSkeets', ['threadId', 'sequence'], {
          unique: true,
          name: 'threadSkeets_thread_sequence_unique',
        });
      }
      if (!(await indexExists(queryInterface, 'ThreadSkeets', 'threadSkeets_remoteId_idx'))) {
        await queryInterface.addIndex('ThreadSkeets', ['remoteId'], {
          unique: false,
          name: 'threadSkeets_remoteId_idx',
        });
      }
    }

    // --- SkeetReactions anlegen ---
    if (!(await tableExists(queryInterface, 'SkeetReactions'))) {
      await queryInterface.createTable('SkeetReactions', {
        id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        threadSkeetId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'ThreadSkeets', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        type: { type: Sequelize.STRING, allowNull: false, defaultValue: 'reply' },
        authorHandle: { type: Sequelize.STRING, allowNull: true },
        authorDisplayName: { type: Sequelize.STRING, allowNull: true },
        content: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify({}) },
        fetchedAt: { type: Sequelize.DATE, allowNull: true },
        remoteId: { type: Sequelize.STRING, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    if (await tableExists(queryInterface, 'SkeetReactions')) {
      if (!(await indexExists(queryInterface, 'SkeetReactions', 'skeetReactions_threadSkeet_idx'))) {
        await queryInterface.addIndex('SkeetReactions', ['threadSkeetId'], {
          name: 'skeetReactions_threadSkeet_idx',
        });
      }
      if (!(await indexExists(queryInterface, 'SkeetReactions', 'skeetReactions_remoteId_idx'))) {
        await queryInterface.addIndex('SkeetReactions', ['remoteId'], {
          name: 'skeetReactions_remoteId_idx',
        });
      }
    }
  },

  async down(queryInterface) {
    // Indizes/Tabellen in umgekehrter Reihenfolge
    if (await tableExists(queryInterface, 'SkeetReactions')) {
      if (await indexExists(queryInterface, 'SkeetReactions', 'skeetReactions_threadSkeet_idx')) {
        await queryInterface.removeIndex('SkeetReactions', 'skeetReactions_threadSkeet_idx');
      }
      if (await indexExists(queryInterface, 'SkeetReactions', 'skeetReactions_remoteId_idx')) {
        await queryInterface.removeIndex('SkeetReactions', 'skeetReactions_remoteId_idx');
      }
      await queryInterface.dropTable('SkeetReactions');
    }

    if (await tableExists(queryInterface, 'ThreadSkeets')) {
      if (await indexExists(queryInterface, 'ThreadSkeets', 'threadSkeets_thread_sequence_unique')) {
        await queryInterface.removeIndex('ThreadSkeets', 'threadSkeets_thread_sequence_unique');
      }
      if (await indexExists(queryInterface, 'ThreadSkeets', 'threadSkeets_remoteId_idx')) {
        await queryInterface.removeIndex('ThreadSkeets', 'threadSkeets_remoteId_idx');
      }
      await queryInterface.dropTable('ThreadSkeets');
    }

    // Spalten nur entfernen, wenn vorhanden
    const dropCol = (col) => columnExists(queryInterface, 'Threads', col).then(exists => exists && queryInterface.removeColumn('Threads', col));

    await dropCol('metadata');
    await dropCol('appendNumbering');
    await dropCol('targetPlatforms');
    await dropCol('status');
    await dropCol('scheduledAt');
    await dropCol('updatedAt');

    // title wieder not null
    await queryInterface.changeColumn('Threads', 'title', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};

