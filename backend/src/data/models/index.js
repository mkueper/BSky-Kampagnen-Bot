// src/models/index.js
/**
 * Setzt sämtliche Sequelize-Modelle auf und definiert deren Relationen.
 *
 * Dieses Modul dient als zentrale Import-Stelle: `require("../models")` gibt
 * die initialisierte Sequelize-Instanz samt Models zurück, sodass Controller
 * oder Services keine Wiederholungslogik benötigen.
 */
const sequelize = require("./db");
const { DataTypes } = require("sequelize");

const Thread = require("./threadModel")(sequelize, DataTypes);
const ThreadSkeet = require("./threadSkeetModel")(sequelize, DataTypes);
const SkeetReaction = require("./skeetReactionModel")(sequelize, DataTypes);
const Skeet = require("./skeetModel")(sequelize, DataTypes);
const Reply = require("./replyModel")(sequelize, DataTypes);
const ThreadSkeetMedia = require("./threadSkeetMediaModel")(sequelize, DataTypes);
const SkeetMedia = require("./skeetMediaModel")(sequelize, DataTypes);
const Setting = require("./settingModel")(sequelize, DataTypes);
const PostSendLog = require("./postSendLogModel")(sequelize, DataTypes);

// --- Relationen ---
// Ein Thread besteht aus vielen Skeets (z. B. Post-Reihen).
Thread.hasMany(Skeet, { foreignKey: "threadId", as: "scheduledSkeets" });
Skeet.belongsTo(Thread, { foreignKey: "threadId", as: "parentThread" });

Thread.hasMany(ThreadSkeet, { foreignKey: "threadId", as: "segments" });
ThreadSkeet.belongsTo(Thread, { foreignKey: "threadId", as: "thread" });

ThreadSkeet.hasMany(SkeetReaction, { foreignKey: "threadSkeetId", as: "reactions" });
SkeetReaction.belongsTo(ThreadSkeet, { foreignKey: "threadSkeetId", as: "segment" });

// Ein Skeet erhält mehrere Replies; Replies gehören genau zu einem Skeet.
Skeet.hasMany(Reply, { foreignKey: "skeetId", as: "replies" });
Reply.belongsTo(Skeet, { foreignKey: "skeetId", as: "skeet" });


// Associations
ThreadSkeetMedia.belongsTo(ThreadSkeet, { foreignKey: 'threadSkeetId', as: 'segment' });
ThreadSkeet.hasMany(ThreadSkeetMedia, { foreignKey: 'threadSkeetId', as: 'media' });
SkeetMedia.belongsTo(Skeet, { foreignKey: 'skeetId', as: 'skeet' });
Skeet.hasMany(SkeetMedia, { foreignKey: 'skeetId', as: 'media' });
Skeet.hasMany(PostSendLog, { foreignKey: 'skeetId', as: 'sendLogs' });
PostSendLog.belongsTo(Skeet, { foreignKey: 'skeetId', as: 'skeet' });

module.exports = { sequelize, Thread, ThreadSkeet, SkeetReaction, Skeet, Reply, Setting, ThreadSkeetMedia, SkeetMedia, PostSendLog };
