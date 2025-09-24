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
const Skeet = require("./skeetModel")(sequelize, DataTypes);
const Reply = require("./replyModel")(sequelize, DataTypes);
const Setting = require("./settingModel")(sequelize, DataTypes);

// --- Relationen ---
// Ein Thread besteht aus vielen Skeets (z. B. Post-Reihen).
Thread.hasMany(Skeet, { foreignKey: "threadId", as: "skeets" });
Skeet.belongsTo(Thread, { foreignKey: "threadId", as: "thread" });

// Ein Skeet erhält mehrere Replies; Replies gehören genau zu einem Skeet.
Skeet.hasMany(Reply, { foreignKey: "skeetId", as: "replies" });
Reply.belongsTo(Skeet, { foreignKey: "skeetId", as: "skeet" });


module.exports = { sequelize, Thread, Skeet, Reply, Setting };
