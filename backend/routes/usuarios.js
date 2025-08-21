// routes/usuarios.js
const express = require("express");
const router = express.Router();
const Usuario = require("../models/Usuario");

router.get("/:id", async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: ["dependencia"], // si tienes relación con Dependencia
    });
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

module.exports = router;
