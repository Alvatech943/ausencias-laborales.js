// lib/permiso.js
const Dependencia = require('../models/Dependencia');

/** Verifica si el usuario es jefe de la dependencia dada */
async function esJefeDeArea(usuarioId, dependenciaId) {
  const dep = await Dependencia.findByPk(dependenciaId);
  if (!dep) return false;

  // Normalizamos a número por si el JWT trae string
  return Number(dep.jefe_usuario_id) === Number(usuarioId);
}

/** Verifica si el usuario es secretario de la secretaría padre */
async function esSecretarioDeSecretaria(usuarioId, dependenciaId) {
  const dep = await Dependencia.findByPk(dependenciaId);
  if (!dep) return false;

  if (!dep.dependencia_padre_id) return false; // No tiene secretaría padre

  const secretaria = await Dependencia.findByPk(dep.dependencia_padre_id);
  if (!secretaria) return false;

  return Number(secretaria.secretario_usuario_id) === Number(usuarioId);
}

module.exports = { esJefeDeArea, esSecretarioDeSecretaria };
