"use strict";

/**
 * Baseline-Migration: erstellt bzw. stellt die komplette, aktuelle Schema-Struktur her.
 *
 * Diese Version ist idempotent: Für existierende Tabellen/Indizes werden zunächst
 * PRAGMA‑Checks verwendet und nur fehlende Spalten/Indizes ergänzt. Für frische Setups
 * werden Tabellen vollständig erstellt.
 */

async function tableExists(qi, table) {
  const [rows] = await qi.sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=$table;",
    { bind: { table } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(qi, table, column) {
  const [rows] = await qi.sequelize.query(`PRAGMA table_info(${table});`);
  return Array.isArray(rows) && rows.some((r) => r && r.name === column);
}

async function indexExists(qi, table, indexName) {
  const [rows] = await qi.sequelize.query(`PRAGMA index_list(${table});`);
  return Array.isArray(rows) && rows.some((r) => r && r.name === indexName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // --- Threads ---
    if (!(await tableExists(queryInterface, "Threads"))) {
      await queryInterface.createTable("Threads", {
        id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        title: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
        scheduledAt: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
        status: { type: Sequelize.STRING, allowNull: false, defaultValue: "draft" },
        // als TEXT-JSON (SQLite)
        targetPlatforms: { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify(["bluesky"]) },
        appendNumbering: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        // als TEXT-JSON (SQLite)
        metadata: { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify({}) },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
    } else {
      // sicherstellen, dass Spalten vorhanden sind
      if (!(await columnExists(queryInterface, "Threads", "title"))) {
        await queryInterface.addColumn("Threads", "title", { type: Sequelize.STRING, allowNull: true, defaultValue: null });
      } else {
        // title optional stellen
        // Hinweis: Unter SQLite kann changeColumn scheitern (Tabellen-Rebuild nötig).
        // Da dies eine Baseline/Best‑Effort Migration ist, tolerieren wir den Fehler.
        try {
          await queryInterface.changeColumn("Threads", "title", { type: Sequelize.STRING, allowNull: true });
        } catch { /* ignore changeColumn failure on sqlite */ }
      }
      if (!(await columnExists(queryInterface, "Threads", "scheduledAt"))) {
        await queryInterface.addColumn("Threads", "scheduledAt", { type: Sequelize.DATE, allowNull: true, defaultValue: null });
      }
      if (!(await columnExists(queryInterface, "Threads", "status"))) {
        await queryInterface.addColumn("Threads", "status", { type: Sequelize.STRING, allowNull: false, defaultValue: "draft" });
      }
      if (!(await columnExists(queryInterface, "Threads", "targetPlatforms"))) {
        await queryInterface.addColumn("Threads", "targetPlatforms", { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify(["bluesky"]) });
      }
      if (!(await columnExists(queryInterface, "Threads", "appendNumbering"))) {
        await queryInterface.addColumn("Threads", "appendNumbering", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
      }
      if (!(await columnExists(queryInterface, "Threads", "metadata"))) {
        await queryInterface.addColumn("Threads", "metadata", { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify({}) });
      }
      if (!(await columnExists(queryInterface, "Threads", "createdAt"))) {
        await queryInterface.addColumn("Threads", "createdAt", { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") });
      }
      if (!(await columnExists(queryInterface, "Threads", "updatedAt"))) {
        await queryInterface.addColumn("Threads", "updatedAt", { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") });
      }
    }

    // --- Skeets ---
    if (!(await tableExists(queryInterface, "Skeets"))) {
      await queryInterface.createTable("Skeets", {
        id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        content: { type: Sequelize.TEXT, allowNull: false },
        scheduledAt: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
        postUri: { type: Sequelize.STRING, allowNull: true },
        likesCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        repostsCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        postedAt: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
        // als STRING statt ENUM für SQLite, Validierung erfolgt im Model
        repeat: { type: Sequelize.STRING, allowNull: false, defaultValue: "none" },
        repeatDayOfWeek: { type: Sequelize.INTEGER, allowNull: true },
        repeatDayOfMonth: { type: Sequelize.INTEGER, allowNull: true },
        // neues Feld: Liste von Wochentagen (als JSON-String)
        repeatDaysOfWeek: { type: Sequelize.TEXT, allowNull: true, defaultValue: null },

        threadId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "Threads", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        isThreadPost: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

        // als TEXT-JSON (SQLite)
        targetPlatforms: { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify(["bluesky"]) },
        // als TEXT-JSON (SQLite)
        platformResults: { type: Sequelize.TEXT, allowNull: true, defaultValue: null },

        // Paranoid/Soft-Delete
        deletedAt: { type: Sequelize.DATE, allowNull: true, defaultValue: null },

        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
    } else {
      const cols = [
        ["content", { type: Sequelize.TEXT, allowNull: false }],
        ["scheduledAt", { type: Sequelize.DATE, allowNull: true, defaultValue: null }],
        ["postUri", { type: Sequelize.STRING, allowNull: true }],
        ["likesCount", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
        ["repostsCount", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
        ["postedAt", { type: Sequelize.DATE, allowNull: true, defaultValue: null }],
        ["repeat", { type: Sequelize.STRING, allowNull: false, defaultValue: "none" }],
        ["repeatDayOfWeek", { type: Sequelize.INTEGER, allowNull: true }],
        ["repeatDayOfMonth", { type: Sequelize.INTEGER, allowNull: true }],
        ["repeatDaysOfWeek", { type: Sequelize.TEXT, allowNull: true, defaultValue: null }],
        ["threadId", { type: Sequelize.INTEGER, allowNull: true }],
        ["isThreadPost", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }],
        ["targetPlatforms", { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify(["bluesky"]) }],
        ["platformResults", { type: Sequelize.TEXT, allowNull: true, defaultValue: null }],
        ["deletedAt", { type: Sequelize.DATE, allowNull: true, defaultValue: null }],
        ["createdAt", { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }],
        ["updatedAt", { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }],
      ];
      for (const [name, def] of cols) {
        if (!(await columnExists(queryInterface, "Skeets", name))) {
          await queryInterface.addColumn("Skeets", name, def);
        }
      }
    }
    if (!(await indexExists(queryInterface, "Skeets", "skeets_scheduledAt_idx"))) {
      await queryInterface.addIndex("Skeets", ["scheduledAt"], { name: "skeets_scheduledAt_idx" });
    }
    if (!(await indexExists(queryInterface, "Skeets", "skeets_threadId_idx"))) {
      await queryInterface.addIndex("Skeets", ["threadId"], { name: "skeets_threadId_idx" });
    }
    if (!(await indexExists(queryInterface, "Skeets", "skeets_deletedAt_idx"))) {
      await queryInterface.addIndex("Skeets", ["deletedAt"], { name: "skeets_deletedAt_idx" });
    }

    // --- Replies ---
    if (!(await tableExists(queryInterface, "Replies"))) {
      await queryInterface.createTable("Replies", {
        id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
        skeetId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Skeets", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        authorHandle: { type: Sequelize.STRING, allowNull: false },
        content: { type: Sequelize.TEXT, allowNull: false },
        platform: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
    } else {
      if (!(await columnExists(queryInterface, "Replies", "platform"))) {
        await queryInterface.addColumn("Replies", "platform", { type: Sequelize.STRING, allowNull: true, defaultValue: null });
      }
    }
    if (!(await indexExists(queryInterface, "Replies", "replies_skeetId_idx"))) {
      await queryInterface.addIndex("Replies", ["skeetId"], { name: "replies_skeetId_idx" });
    }

    // --- Settings ---
    if (!(await tableExists(queryInterface, "Settings"))) {
      await queryInterface.createTable("Settings", {
        id: { type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
        key: { type: Sequelize.STRING, allowNull: false, unique: true },
        value: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
    }

    // --- ThreadSkeets ---
    if (!(await tableExists(queryInterface, "ThreadSkeets"))) {
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
        postedAt: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
        remoteId: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
        // als TEXT-JSON (SQLite)
        platformPayload: { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify({}) },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
    } else {
      const cols = [
        ["sequence", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
        ["appendNumbering", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }],
        ["characterCount", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
        ["postedAt", { type: Sequelize.DATE, allowNull: true, defaultValue: null }],
        ["remoteId", { type: Sequelize.STRING, allowNull: true, defaultValue: null }],
        ["platformPayload", { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify({}) }],
      ];
      for (const [name, def] of cols) {
        if (!(await columnExists(queryInterface, "ThreadSkeets", name))) {
          await queryInterface.addColumn("ThreadSkeets", name, def);
        }
      }
    }
    if (!(await indexExists(queryInterface, "ThreadSkeets", "threadSkeets_thread_sequence_unique"))) {
      await queryInterface.addIndex("ThreadSkeets", ["threadId", "sequence"], { unique: true, name: "threadSkeets_thread_sequence_unique" });
    }
    if (!(await indexExists(queryInterface, "ThreadSkeets", "threadSkeets_remoteId_idx"))) {
      await queryInterface.addIndex("ThreadSkeets", ["remoteId"], { name: "threadSkeets_remoteId_idx" });
    }

    // --- SkeetReactions ---
    if (!(await tableExists(queryInterface, "SkeetReactions"))) {
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
        authorHandle: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
        authorDisplayName: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
        content: { type: Sequelize.TEXT, allowNull: true, defaultValue: null },
        // als TEXT-JSON (SQLite)
        metadata: { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify({}) },
        fetchedAt: { type: Sequelize.DATE, allowNull: true, defaultValue: null },
        remoteId: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
    } else {
      const cols = [
        ["type", { type: Sequelize.STRING, allowNull: false, defaultValue: "reply" }],
        ["authorHandle", { type: Sequelize.STRING, allowNull: true, defaultValue: null }],
        ["authorDisplayName", { type: Sequelize.STRING, allowNull: true, defaultValue: null }],
        ["content", { type: Sequelize.TEXT, allowNull: true, defaultValue: null }],
        ["metadata", { type: Sequelize.TEXT, allowNull: false, defaultValue: JSON.stringify({}) }],
        ["fetchedAt", { type: Sequelize.DATE, allowNull: true, defaultValue: null }],
        ["remoteId", { type: Sequelize.STRING, allowNull: true, defaultValue: null }],
      ];
      for (const [name, def] of cols) {
        if (!(await columnExists(queryInterface, "SkeetReactions", name))) {
          await queryInterface.addColumn("SkeetReactions", name, def);
        }
      }
    }
    if (!(await indexExists(queryInterface, "SkeetReactions", "skeetReactions_threadSkeet_idx"))) {
      await queryInterface.addIndex("SkeetReactions", ["threadSkeetId"], { name: "skeetReactions_threadSkeet_idx" });
    }
    if (!(await indexExists(queryInterface, "SkeetReactions", "skeetReactions_remoteId_idx"))) {
      await queryInterface.addIndex("SkeetReactions", ["remoteId"], { name: "skeetReactions_remoteId_idx" });
    }

    // --- SkeetMedia ---
    if (!(await tableExists(queryInterface, "SkeetMedia"))) {
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
        altText: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
    } else {
      const cols = [
        ["order", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
        ["path", { type: Sequelize.STRING, allowNull: false }],
        ["mime", { type: Sequelize.STRING, allowNull: false }],
        ["size", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
        ["altText", { type: Sequelize.STRING, allowNull: true, defaultValue: null }],
      ];
      for (const [name, def] of cols) {
        if (!(await columnExists(queryInterface, "SkeetMedia", name))) {
          await queryInterface.addColumn("SkeetMedia", name, def);
        }
      }
    }
    if (!(await indexExists(queryInterface, "SkeetMedia", "skeetMedia_skeet_idx"))) {
      await queryInterface.addIndex("SkeetMedia", ["skeetId"], { name: "skeetMedia_skeet_idx" });
    }
    if (!(await indexExists(queryInterface, "SkeetMedia", "skeetMedia_order_idx"))) {
      await queryInterface.addIndex("SkeetMedia", ["order"], { name: "skeetMedia_order_idx" });
    }

    // --- ThreadSkeetMedia ---
    if (!(await tableExists(queryInterface, "ThreadSkeetMedia"))) {
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
        altText: { type: Sequelize.STRING, allowNull: true, defaultValue: null },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
    } else {
      const cols = [
        ["order", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
        ["path", { type: Sequelize.STRING, allowNull: false }],
        ["mime", { type: Sequelize.STRING, allowNull: false }],
        ["size", { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
        ["altText", { type: Sequelize.STRING, allowNull: true, defaultValue: null }],
      ];
      for (const [name, def] of cols) {
        if (!(await columnExists(queryInterface, "ThreadSkeetMedia", name))) {
          await queryInterface.addColumn("ThreadSkeetMedia", name, def);
        }
      }
    }
    if (!(await indexExists(queryInterface, "ThreadSkeetMedia", "threadSkeetMedia_threadSkeet_idx"))) {
      await queryInterface.addIndex("ThreadSkeetMedia", ["threadSkeetId"], { name: "threadSkeetMedia_threadSkeet_idx" });
    }
    if (!(await indexExists(queryInterface, "ThreadSkeetMedia", "threadSkeetMedia_order_idx"))) {
      await queryInterface.addIndex("ThreadSkeetMedia", ["order"], { name: "threadSkeetMedia_order_idx" });
    }
  },

  async down(queryInterface /*, Sequelize */) {
    // Reihenfolge wichtig (abhängige Tabellen zuerst entfernen)
    await queryInterface.removeIndex("ThreadSkeetMedia", "threadSkeetMedia_threadSkeet_idx").catch(() => {});
    await queryInterface.removeIndex("ThreadSkeetMedia", "threadSkeetMedia_order_idx").catch(() => {});
    await queryInterface.dropTable("ThreadSkeetMedia").catch(() => {});

    await queryInterface.removeIndex("SkeetMedia", "skeetMedia_skeet_idx").catch(() => {});
    await queryInterface.removeIndex("SkeetMedia", "skeetMedia_order_idx").catch(() => {});
    await queryInterface.dropTable("SkeetMedia").catch(() => {});

    await queryInterface.removeIndex("SkeetReactions", "skeetReactions_threadSkeet_idx").catch(() => {});
    await queryInterface.removeIndex("SkeetReactions", "skeetReactions_remoteId_idx").catch(() => {});
    await queryInterface.dropTable("SkeetReactions").catch(() => {});

    await queryInterface.removeIndex("ThreadSkeets", "threadSkeets_thread_sequence_unique").catch(() => {});
    await queryInterface.removeIndex("ThreadSkeets", "threadSkeets_remoteId_idx").catch(() => {});
    await queryInterface.dropTable("ThreadSkeets").catch(() => {});

    await queryInterface.removeIndex("Replies", "replies_skeetId_idx").catch(() => {});
    await queryInterface.dropTable("Replies").catch(() => {});

    await queryInterface.removeIndex("Skeets", "skeets_scheduledAt_idx").catch(() => {});
    await queryInterface.removeIndex("Skeets", "skeets_threadId_idx").catch(() => {});
    await queryInterface.removeIndex("Skeets", "skeets_deletedAt_idx").catch(() => {});
    await queryInterface.dropTable("Skeets").catch(() => {});

    await queryInterface.dropTable("Settings").catch(() => {});
    await queryInterface.dropTable("Threads").catch(() => {});
  },
};
