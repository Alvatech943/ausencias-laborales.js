// routes/admin.js
const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Usuario = require('../models/Usuario');
const Dependencia = require('../models/Dependencia');

router.get('/usuarios', auth, isAdmin, async (req, res) => {
  try {
    const { q = "" } = req.query;
    if (!q.trim()) return res.json([]);

    const { Op } = require('sequelize');
    const rows = await Usuario.findAll({
      where: {
        [Op.or]: [
          { nombre:   { [Op.like]: `%${q}%` } },
          { usuario:  { [Op.like]: `%${q}%` } },
          { cedula:   { [Op.like]: `%${q}%` } },
        ]
      },
      attributes: ['id', 'usuario', 'nombre', 'cedula', 'dependencia_id'],
      limit: 20,
      order: [['nombre', 'ASC']]
    });

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

router.post('/dependencias', auth, isAdmin, async (req,res)=>{
  try {
    const { nombre, dependencia_padre_id, estado = 'activa' } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error:'nombre es obligatorio' });
    if (!['activa','inactiva'].includes(estado)) return res.status(400).json({ error:'estado inválido' });

    let padreId = null;
    if (dependencia_padre_id) {
      const padre = await Dependencia.findByPk(Number(dependencia_padre_id));
      if (!padre) return res.status(400).json({ error:'dependencia_padre_id no existe' });
      // (opcional) restringir a 2 niveles: solo hijas de raíz
      // if (padre.dependencia_padre_id) return res.status(400).json({ error: 'Solo se permite 2 niveles (padre debe ser raíz)' });
      padreId = padre.id;
    }

    const dep = await Dependencia.create({
      nombre: nombre.trim(),
      dependencia_padre_id: padreId,
      estado,
    });

    res.json({ message:'Dependencia creada', dependencia: dep });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ====== ACTUALIZAR DEPENDENCIA ====== */
router.put('/dependencias/:id', auth, isAdmin, async (req,res)=>{
  try {
    const { id } = req.params;
    const { nombre, estado, dependencia_padre_id } = req.body;

    const dep = await Dependencia.findByPk(Number(id));
    if (!dep) return res.status(404).json({ error:'Dependencia no encontrada' });

    const data = {};
    if (typeof nombre === 'string') data.nombre = nombre.trim();
    if (estado) {
      if (!['activa','inactiva'].includes(estado)) return res.status(400).json({ error:'estado inválido' });
      data.estado = estado;
    }
    if (dependencia_padre_id !== undefined) {
      if (dependencia_padre_id === null || dependencia_padre_id === '') data.dependencia_padre_id = null;
      else {
        const padre = await Dependencia.findByPk(Number(dependencia_padre_id));
        if (!padre) return res.status(400).json({ error:'dependencia_padre_id no existe' });
        data.dependencia_padre_id = padre.id;
      }
    }

    await dep.update(data);
    res.json({ message:'Dependencia actualizada', dependencia: dep });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ====== CAMBIAR ESTADO DEPENDENCIA ====== */
router.patch('/dependencias/:id/estado', auth, isAdmin, async (req,res)=>{
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['activa','inactiva'].includes(estado)) return res.status(400).json({ error:'estado inválido' });
    const dep = await Dependencia.findByPk(Number(id));
    if (!dep) return res.status(404).json({ error:'Dependencia no encontrada' });
    await dep.update({ estado });
    res.json({ message:`Dependencia ${estado}`, dependencia: dep });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ====== CAMBIAR ESTADO USUARIO ====== */
router.patch('/usuarios/:id/estado', auth, isAdmin, async (req,res)=>{
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['activo','inactivo'].includes(estado)) return res.status(400).json({ error:'estado inválido' });
    const u = await Usuario.findByPk(Number(id));
    if (!u) return res.status(404).json({ error:'Usuario no encontrado' });
    await u.update({ estado });
    res.json({ message:`Usuario ${estado}`, usuario: { id: u.id, usuario: u.usuario, estado: u.estado }});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;
