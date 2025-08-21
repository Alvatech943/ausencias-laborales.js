// routes/dependencias.js
const express = require("express");
const router = express.Router();
const Dependencia = require("../models/Dependencia");

// GET /api/dependencias
router.get("/", async (req, res) => {
  try {
    const dependencias = await Dependencia.findAll();
    res.json(dependencias);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener dependencias" });
  }
});

module.exports = router;
