const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Usuario = require("./Usuario");

const Solicitud = sequelize.define("Solicitud", {
  id: 
  { type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true },

  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'usuarioId', 
    references: { model: 'usuarios', key: 'id' }
  },

  dependencia_id: { type: DataTypes.INTEGER, allowNull: true },

  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

  nombre_completo: DataTypes.STRING,
  cedula: DataTypes.STRING,
  cargo: DataTypes.STRING,
  secretaria_oficina: DataTypes.STRING,

  area_trabajo: DataTypes.STRING, 

  // Motivos
  estudios: { type: DataTypes.BOOLEAN, defaultValue: false },
  cita_medica: { type: DataTypes.BOOLEAN, defaultValue: false },
  licencia: { type: DataTypes.BOOLEAN, defaultValue: false },
  compensatorio: { type: DataTypes.BOOLEAN, defaultValue: false },
  otro: { type: DataTypes.BOOLEAN, defaultValue: false },
  motivo: DataTypes.TEXT,

  // Horas
  fecha_horas: DataTypes.DATE,
  numero_horas: DataTypes.INTEGER,
  hora_inicio: DataTypes.TIME,
  hora_fin: DataTypes.TIME,

  // Días
  numero_dias: DataTypes.INTEGER,
  dia_inicio: DataTypes.DATE,
  dia_fin: DataTypes.DATE,

  // Revisión Talento Humano (flags históricos)
  reviso_si: { type: DataTypes.BOOLEAN, defaultValue: false },
  reviso_no: { type: DataTypes.BOOLEAN, defaultValue: false },
  ajusta_ley_si: { type: DataTypes.BOOLEAN, defaultValue: false },
  ajusta_ley_no: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Firmas / nombres (visual)
  firma_solicitante: DataTypes.STRING,
  firma_jefe_inmediato: DataTypes.STRING,
  nombre_jefe_inmediato: DataTypes.STRING,
  firma_secretario: DataTypes.STRING,
  nombre_secretario: DataTypes.STRING,

  // Auditoría nueva
  aprobado_jefe_por: { type: DataTypes.INTEGER, allowNull: true },
  aprobado_jefe_at:  { type: DataTypes.DATE, allowNull: true },
  obs_jefe:          { type: DataTypes.TEXT,  allowNull: true },

  aprobado_secretario_por: { type: DataTypes.INTEGER, allowNull: true },
  aprobado_secretario_at:  { type: DataTypes.DATE, allowNull: true },
  obs_secretario:          { type: DataTypes.TEXT,  allowNull: true },

  estado: {
    type: DataTypes.ENUM('pendiente_jefe', 'pendiente_secretario', 'aprobada', 'rechazada'),
    defaultValue: 'pendiente_jefe'
  }
}, {
  tableName: "solicitudes",
  timestamps: false
});

// Relaciones existentes
Solicitud.belongsTo(Usuario, { foreignKey: "usuarioId" });
Usuario.hasMany(Solicitud, { foreignKey: "usuarioId" });

module.exports = Solicitud;
