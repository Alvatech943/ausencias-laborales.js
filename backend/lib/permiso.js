// backend/lib/permiso.js
const Dependencia = require('../models/Dependencia');

function isUsernameAdmin(username) {
  const list = (process.env.ADMIN_USERS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return !!username && list.includes(String(username).toLowerCase());
}

async function inferirRol(userId, username) {
  if (isUsernameAdmin(username)) return 'admin';

  const secCount  = await Dependencia.count({ where: { secretario_usuario_id: userId } });
  if (secCount > 0) return 'secretario';

  const jefeCount = await Dependencia.count({ where: { jefe_usuario_id: userId } });
  if (jefeCount > 0) return 'jefe';

  return 'empleado';
}

// Helpers que ya usas en solicitudes
async function esJefeDeArea(userId, dependenciaId) {
  const area = await Dependencia.findByPk(dependenciaId);
  if (!area) return false;
  return area.jefe_usuario_id === userId;
}

async function esSecretarioDeSecretaria(userId, areaId) {
  const area = await Dependencia.findByPk(areaId);
  if (!area || !area.dependencia_padre_id) return false;
  const sec = await Dependencia.findByPk(area.dependencia_padre_id);
  return !!sec && sec.secretario_usuario_id === userId;
}

module.exports = { inferirRol, esJefeDeArea, esSecretarioDeSecretaria, isUsernameAdmin };
