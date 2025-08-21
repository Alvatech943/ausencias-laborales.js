// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const Usuario = require('../models/Usuario');
const Dependencia = require('../models/Dependencia');
const auth = require('../middleware/auth');  // 👈 añade esto

const router = express.Router();

/** 👇 Helper: deduce rol desde dependencias */
async function inferirRol(userId) {
  // ¿Es secretario de alguna dependencia raíz?
  const esSecretario = await Dependencia.count({
    where: { secretario_usuario_id: userId, dependencia_padre_id: null }
  });

  if (esSecretario > 0) return 'SECRETARIO';

  // ¿Es jefe de algún área (hija)?
  const esJefe = await Dependencia.count({
    where: { jefe_usuario_id: userId }
  });

  if (esJefe > 0) return 'JEFE';

  return 'EMPLEADO';
}

// POST /api/auth/register  → Crea EMPLEADO
router.post('/register', async (req, res) => {
  try {
    const { nombre, usuario, password, cedula, dependencia_id } = req.body;

    if (!nombre || !usuario || !password || !cedula || !dependencia_id) {
      return res.status(400).json(
{ error: 'nombre, usuario, password, cedula y dependencia_id son obligatorios' }
      );
    }

    const dep = await Dependencia.findByPk(Number(dependencia_id));
    if (!dep) return res.status(400).json({ error: 'dependencia_id no existe' });

    // Unicidad
    const yaExiste = await Usuario.findOne({ where: { [Op.or]: [{ usuario }, { cedula }] } });
    if (yaExiste) return res.status(409).json({ error: 'usuario o cedula ya registrados' });

    const hashed = await bcrypt.hash(password, 10);

    const user = await Usuario.create({
      nombre,
      usuario,
      password: hashed,
      cedula,
      dependencia_id: Number(dependencia_id)
    });

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, dependencia_id: user.dependencia_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 👇 nuevo: también devolvemos rol inferido (será EMPLEADO tras registrarse)
    const rol = await inferirRol(user.id);

    return res.json({
      message: 'Empleado registrado correctamente',
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

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    const user = await Usuario.findOne({ where: { usuario } });
    if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, dependencia_id: user.dependencia_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 👇 nuevo: incluimos rol inferido en la respuesta del login
    const rol = await inferirRol(user.id);

    return res.json({
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

/** 👇 NUEVO: /api/auth/me (requiere token) 
 *  Devuelve usuario + rol actualizado para que el front pueda refrescar estado
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await Usuario.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const rol = await inferirRol(user.id);

    res.json({
      id: user.id,
      usuario: user.usuario,
      dependencia_id: user.dependencia_id,
      rol
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
