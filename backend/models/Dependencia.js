const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Dependencia = sequelize.define('Dependencia', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  dependencia_padre_id: { type: DataTypes.INTEGER, allowNull: true },
  secretario_usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  jefe_usuario_id:       { type: DataTypes.INTEGER, allowNull: true },

  estado: {
    type: DataTypes.ENUM('activa', 'inactiva'),
    defaultValue: 'activa',
  },
}, {
  tableName: 'dependencias',
  timestamps: false,
});

Dependencia.belongsTo(Dependencia, {
  as: "padre",
  foreignKey: "dependencia_padre_id",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
Dependencia.hasMany(Dependencia, { as: "hijos", foreignKey: "dependencia_padre_id" });

module.exports = Dependencia;