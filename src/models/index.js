const sequelize = require("./db");
const { DataTypes } = require("sequelize");

const Thread = require("./threadModel")(sequelize, DataTypes);
const Skeet = require("./skeetModel")(sequelize, DataTypes);
const Reply = require("./replyModel")(sequelize, DataTypes);

Thread.hasMany(Skeet, { foreignKey: "threadId", as: "skeets" });
Skeet.belongsTo(Thread, { foreignKey: "threadId", as: "thread" });

Skeet.hasMany(Reply, { foreignKey: "skeetId", as: "replies" });
Reply.belongsTo(Skeet, { foreignKey: "skeetId", as: "skeet" });


module.exports = { sequelize, Thread, Skeet, Reply };
