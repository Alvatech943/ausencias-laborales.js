// routes/admin.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Usuario = require('../models/Usuario');
const Dependencia = require('../models/Dependencia');

// Asignar JEFE a un área (área hija: tiene dependencia_padre_id)
router.put('/areas/:areaId/jefe', auth, isAdmin, async (req, res) => {
  try {
    const { areaId } = req.params;
    const { usuarioId, usuarioLogin } = req.body;

    const area = await Dependencia.findByPk(Number(areaId));
    if (!area) return res.status(404).json({ error: 'Área no encontrada' });
    if (!area.dependencia_padre_id) {
      return res.status(400).json({ error: 'La dependencia indicada no es un área hija (es raíz)' });
    }

    let user = null;
    if (usuarioId) user = await Usuario.findByPk(Number(usuarioId));
    if (!user && usuarioLogin) user = await Usuario.findOne({ where: { usuario: usuarioLogin } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await area.update({ jefe_usuario_id: user.id });
    return res.json({ message: 'Jefe asignado', area: { id: area.id, nombre: area.nombre }, jefe: { id: user.id, usuario: user.usuario } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Asignar SECRETARIO a una secretaría (raíz: sin dependencia_padre_id)
router.put('/secretarias/:secretariaId/secretario', auth, isAdmin, async (req, res) => {
  try {
    const { secretariaId } = req.params;
    const { usuarioId, usuarioLogin } = req.body;

    const sec = await Dependencia.findByPk(Number(secretariaId));
    if (!sec) return res.status(404).json({ error: 'Secretaría no encontrada' });
    if (sec.dependencia_padre_id) {
      return res.status(400).json({ error: 'La dependencia indicada no es raíz (es un área hija)' });
    }

    let user = null;
    if (usuarioId) user = await Usuario.findByPk(Number(usuarioId));
    if (!user && usuarioLogin) user = await Usuario.findOne({ where: { usuario: usuarioLogin } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await sec.update({ secretario_usuario_id: user.id });
    return res.json({ message: 'Secretario asignado', secretaria: { id: sec.id, nombre: sec.nombre }, secretario: { id: user.id, usuario: user.usuario } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
