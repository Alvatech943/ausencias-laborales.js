const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Usuario = sequelize.define("Usuario", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  usuario: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  cedula: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  dependencia_id: { type: DataTypes.INTEGER, allowNull: true },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    defaultValue: 'activo',
  },
}, {
  tableName: 'usuarios',
  timestamps: false,
});

const Dependencia = require('./Dependencia');
Usuario.belongsTo(Dependencia, { as: 'dependencia', foreignKey: 'dependencia_id' });

module.exports = Usuario;
