const Usuario = require('./Usuario');
const Dependencia = require('./Dependencia');

// Jerarquía de dependencias
Dependencia.belongsTo(Dependencia, { as: 'padre', foreignKey: 'dependencia_padre_id', constraints: true });
Dependencia.hasMany(Dependencia,  { as: 'hijas', foreignKey: 'dependencia_padre_id', constraints: true });

// Usuario ↔ Dependencia (pertenencia del usuario a una dependencia)
Usuario.belongsTo(Dependencia, { foreignKey: 'dependencia_id', as: 'dependencia' });
Dependencia.hasMany(Usuario,    { foreignKey: 'dependencia_id', as: 'usuarios' });

// Las dos FKs que te interesan:
Dependencia.belongsTo(Usuario,  { as: 'secretario', foreignKey: 'secretario_usuario_id', constraints: true });
Dependencia.belongsTo(Usuario,  { as: 'jefe',       foreignKey: 'jefe_usuario_id',       constraints: true });

// (Opcionales inversas)
Usuario.hasMany(Dependencia,    { as: 'secretarias',   foreignKey: 'secretario_usuario_id' });
Usuario.hasMany(Dependencia,    { as: 'areasJefeadas', foreignKey: 'jefe_usuario_id' });


module.exports = { Usuario, Dependencia };
