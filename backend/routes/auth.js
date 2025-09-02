// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const Usuario = require('../models/Usuario');
const Dependencia = require('../models/Dependencia');
const auth = require('../middleware/auth');
const { inferirRol, isUsernameAdmin } = require('../lib/permiso'); // ← usa SOLO la del helper

const router = express.Router();

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    

    const user = await Usuario.findOne({ where: { usuario } });
    if (!user) return res.status(400).json({ error: 'Usuario incorrecto' });

    if (user.estado === 'inactivo') {
      return res.status(403).json({ error: 'El usuario está inactivo. Contacta al administrador.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'contraseña incorrecta' });

    // rol desde helper (ya contempla admin si está en ADMIN_USERS)
    const rol = await inferirRol(user.id, user.usuario);

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, dependencia_id: user.dependencia_id, rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      id: user.id,
      usuario: user.usuario,
      dependencia_id: user.dependencia_id,
      rol
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REGISTER (permite bootstrap de admin)
router.post('/register', async (req, res) => {
  try {
    const { nombre, usuario, password, cedula, dependencia_id } = req.body;

    const bootstrapAdmin = isUsernameAdmin(usuario);

    // Validaciones mínimas
    if (!nombre || !usuario || !password || !cedula) {
      return res.status(400).json({ error: 'nombre, usuario, password y cedula son obligatorios' });
    }

    // Si NO es admin, dependencia_id es obligatoria
    if (!bootstrapAdmin && !dependencia_id) {
      return res.status(400).json({ error: 'dependencia_id es obligatoria para no-admin' });
    }

    // Validar dependencia si viene
    let depId = null;
    if (dependencia_id) {
      const dep = await Dependencia.findByPk(Number(dependencia_id));
      if (!dep) return res.status(400).json({ error: 'dependencia_id no existe' });
      depId = Number(dependencia_id);
    }

    // Unicidad
    const yaExiste = await Usuario.findOne({ where: { [Op.or]: [{ usuario }, { cedula }] } });
    if (yaExiste) return res.status(409).json({ error: 'usuario o cedula ya registrados' });

    const hashed = await bcrypt.hash(password, 10);

    const user = await Usuario.create({
      nombre,
      usuario,
      password: hashed,
      cedula,
      dependencia_id: depId // para admin puede ir null
    });

    // rol desde helper (si el usuario está en ADMIN_USERS será 'admin')
    const rol = await inferirRol(user.id, user.usuario);

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, dependencia_id: user.dependencia_id, rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      message: (String(rol).toLowerCase() === 'admin')
        ? 'Admin registrado correctamente'
        : 'Empleado registrado correctamente',
      token,
      id: user.id,
      usuario: user.usuario,
      dependencia_id: user.dependencia_id,
      rol
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Perfil del usuario autenticado
router.get('/me', auth, async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.user.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    let secretaria = null;
    let area = null;

    if (u.dependencia_id) {
      const dep = await Dependencia.findByPk(u.dependencia_id);
      if (dep) {
        if (dep.dependencia_padre_id) {
          // área hija
          const secr = await Dependencia.findByPk(dep.dependencia_padre_id);
          secretaria = secr?.nombre || null;
          area = dep.nombre;
        } else {
          // secretaría raíz
          secretaria = dep.nombre;
          area = null;
        }
      }
    }

    res.json({
      id: u.id,
      usuario: u.usuario,
      nombre: u.nombre,
      cedula: u.cedula,
      dependencia_id: u.dependencia_id,
      secretaria,
      area
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error cargando perfil' });
  }
});

module.exports = router;
