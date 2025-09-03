// routes/admin.js
const router = require('express').Router();
const { Op, fn, col } = require('sequelize'); // 👈 importa fn/col también
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const Usuario = require('../models/Usuario');
const Dependencia = require('../models/Dependencia');

/* ==========================
 *  DEPENDENCIAS: ASIGNACIONES
 * ========================== */

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
    return res.json({
      message: 'Jefe asignado',
      area: { id: area.id, nombre: area.nombre },
      jefe: { id: user.id, usuario: user.usuario }
    });
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
    return res.json({
      message: 'Secretario asignado',
      secretaria: { id: sec.id, nombre: sec.nombre },
      secretario: { id: user.id, usuario: user.usuario }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/* ==========================
 *  DEPENDENCIAS: CRUD BÁSICO
 * ========================== */

router.post('/dependencias', auth, isAdmin, async (req, res) => {
  try {
    const { nombre, dependencia_padre_id, estado = 'activa' } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error:'nombre es obligatorio' });
    if (!['activa','inactiva'].includes(estado)) return res.status(400).json({ error:'estado inválido' });

    let padreId = null;
    if (dependencia_padre_id) {
      const padre = await Dependencia.findByPk(Number(dependencia_padre_id));
      if (!padre) return res.status(400).json({ error:'dependencia_padre_id no existe' });
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

router.put('/dependencias/:id', auth, isAdmin, async (req, res) => {
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
    res.json({ message:'Dependencia actualizado', dependencia: dep });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/dependencias/:id/estado', auth, isAdmin, async (req, res) => {
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

/* ==========================
 *  USUARIOS (ADMIN)
 * ========================== */

// 🔎 Búsqueda rápida (para autocompletar, etc.)
router.get('/usuarios/search', auth, isAdmin, async (req, res) => {
  try {
    const { q = "" } = req.query;
    if (!q.trim()) return res.json([]);
    const rows = await Usuario.findAll({
      where: {
        [Op.or]: [
          { nombre:  { [Op.like]: `%${q}%` } },
          { usuario: { [Op.like]: `%${q}%` } },
          { cedula:  { [Op.like]: `%${q}%` } },
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

// 📋 Listado completo con rol deducido
router.get('/usuarios', auth, isAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'usuario', 'nombre', 'cedula', 'dependencia_id', 'estado'],
      include: [{ model: Dependencia, as: 'dependencia', attributes: ['id','nombre','dependencia_padre_id'] }],
      order: [['nombre','ASC']]
    });

    const jefes = await Dependencia.findAll({
      attributes: ['jefe_usuario_id', [fn('COUNT', col('id')), 'n']],
      where: { jefe_usuario_id: { [Op.ne]: null } },
      group: ['jefe_usuario_id'],
      raw: true
    });
    const secretarios = await Dependencia.findAll({
      attributes: ['secretario_usuario_id', [fn('COUNT', col('id')), 'n']],
      where: { secretario_usuario_id: { [Op.ne]: null } },
      group: ['secretario_usuario_id'],
      raw: true
    });

    const mapJ = Object.fromEntries(jefes.map(r => [r.jefe_usuario_id, Number(r.n)]));
    const mapS = Object.fromEntries(secretarios.map(r => [r.secretario_usuario_id, Number(r.n)]));

    const out = usuarios.map(u => {
      const isJ = !!mapJ[u.id];
      const isS = !!mapS[u.id];
      let rol = 'EMPLEADO';
      if (isJ && isS) rol = 'SECRETARIO+JEFE';
      else if (isS) rol = 'SECRETARIO';
      else if (isJ) rol = 'JEFE';
      return {
        id: u.id,
        usuario: u.usuario,
        nombre: u.nombre,
        cedula: u.cedula,
        estado: u.estado || 'activo',
        dependencia: u.dependencia ? {
          id: u.dependencia.id,
          nombre: u.dependencia.nombre,
          dependencia_padre_id: u.dependencia.dependencia_padre_id
        } : null,
        rol
      };
    });

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Cambiar estado de un usuario (activo/inactivo)
router.patch('/usuarios/:id/estado', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // 'activo' | 'inactivo'
    if (!['activo','inactivo'].includes(String(estado))) {
      return res.status(400).json({ error: 'estado inválido' });
    }
    const u = await Usuario.findByPk(Number(id));
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    u.estado = estado;
    await u.save();
    res.json({ message: 'Estado actualizado', id: u.id, estado: u.estado });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remover TODAS las jefaturas de un usuario
router.post('/usuarios/:id/remover-jefaturas', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Dependencia.update(
      { jefe_usuario_id: null },
      { where: { jefe_usuario_id: Number(id) } }
    );
    res.json({ message: 'Jefaturas removidas' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remover TODAS las secretarías de un usuario (secretario)
router.post('/usuarios/:id/remover-secretarias', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Dependencia.update(
      { secretario_usuario_id: null },
      { where: { secretario_usuario_id: Number(id) } }
    );
    res.json({ message: 'Secretarías removidas' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Datos básicos (para mostrar nombre por id)
router.get('/usuarios/:id', auth, isAdmin, async (req, res) => {
  try {
    const u = await Usuario.findByPk(Number(req.params.id), {
      attributes: ['id','usuario','nombre']
    });
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(u);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;