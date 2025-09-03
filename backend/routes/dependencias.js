// routes/dependencias.js
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Dependencia = require("../models/Dependencia");

// GET /api/dependencias  ( públicas / o con ?all=1 para admin desde el front )
router.get("/", async (req, res) => {
  try {
    const includeAll = String(req.query.all || "") === "1";
    const where = includeAll ? {} : { estado: "activa" };

    const baseAttrs = ["id", "nombre", "dependencia_padre_id", "estado"];
    const adminAttrs = [...baseAttrs, "secretario_usuario_id", "jefe_usuario_id"];

    const deps = await Dependencia.findAll({
      where,
      order: [["nombre", "ASC"]],
      attributes: includeAll ? adminAttrs : baseAttrs,
    });

    res.json(deps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dependencias/search?q=...
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const deps = await Dependencia.findAll({
      where: { nombre: { [Op.like]: `%${q}%` } },
      attributes: ["id", "nombre", "dependencia_padre_id"],
      limit: 50,
      order: [["nombre", "ASC"]],
    });
    res.json(deps);
  } catch (err) {
    res.status(500).json({ error: err.message || "Error buscando dependencias" });
  }
});

module.exports = router;
