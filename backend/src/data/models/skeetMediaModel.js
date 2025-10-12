module.exports = (sequelize, DataTypes) => {
  const SkeetMedia = sequelize.define(
    'SkeetMedia',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      skeetId: { type: DataTypes.INTEGER, allowNull: false },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      path: { type: DataTypes.STRING, allowNull: false },
      mime: { type: DataTypes.STRING, allowNull: false },
      size: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      altText: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: 'SkeetMedia',
      timestamps: true,
      indexes: [
        { fields: ['skeetId'] },
        { fields: ['order'] },
      ],
    }
  );
  return SkeetMedia;
};

