const { Op } = require('sequelize');
const sequelize = require('../config/db'); // <-- FIX: lo usas en /estadisticas
const router = require('express').Router();

const Solicitud = require('../models/Solicitud');
const Usuario = require('../models/Usuario');
const Dependencia = require('../models/Dependencia');
const auth = require('../middleware/auth');
const { esJefeDeArea, esSecretarioDeSecretaria } = require('../lib/permiso');

const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require('docxtemplater-image-module-free');
const sizeOf = require('image-size');

// ---------- Crear nueva ----------
router.post('/', auth, async (req, res) => {
  try {
    const user = await Usuario.findByPk(req.user.id);
    if (!user) return res.status(401).json({ error: 'Usuario no válido' });

    const b = v => (v === true || v === 'true' || v === 1 || v === '1');

    const {
      nombre_completo, cedula, cargo, secretaria_oficina, area_trabajo,
      estudios, cita_medica, licencia, compensatorio, otro, motivo,
      fecha_horas, numero_horas, hora_inicio, hora_fin,
      numero_dias, dia_inicio, dia_fin, firma_solicitante
    } = req.body;

    const nueva = await Solicitud.create({
      usuarioId: user.id,
      dependencia_id: user.dependencia_id,

      nombre_completo: nombre_completo || user.nombre,
      cedula: cedula || user.cedula,
      cargo: cargo || null,
      secretaria_oficina: secretaria_oficina || null,
      area_trabajo: area_trabajo || null,

      estudios: b(estudios),
      cita_medica: b(cita_medica),
      licencia: b(licencia),
      compensatorio: b(compensatorio),
      otro: b(otro),
      motivo: motivo || null,

      fecha_horas: fecha_horas || null,
      numero_horas: numero_horas || null,
      hora_inicio: hora_inicio || null,
      hora_fin: hora_fin || null,

      numero_dias: numero_dias || null,
      dia_inicio: dia_inicio || null,
      dia_fin: dia_fin || null,

      firma_solicitante: firma_solicitante || null,

      estado: 'pendiente_jefe'
    });

    res.json(nueva);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/aprobar-jefe', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { aprobadoJefe, observaciones } = req.body;
    const aprobado = (aprobadoJefe === true || aprobadoJefe === 'true' || aprobadoJefe === 1 || aprobadoJefe === '1');
    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'pendiente_jefe') {
      return res.status(400).json({ error: 'La solicitud no está pendiente del jefe' });
    }

    const puede = await esJefeDeArea(req.user.id, solicitud.dependencia_id);
    if (!puede) {
      const area = await Dependencia.findByPk(solicitud.dependencia_id);
      return res.status(403).json({
        error: 'No eres jefe del área de esta solicitud',
        detalle: {
          solicitud_id: solicitud.id,
          area_id: area?.id,
          area_nombre: area?.nombre,
          jefe_usuario_id_configurado: area?.jefe_usuario_id,
          tu_usuario_id: req.user.id
        }
      });
    }

    solicitud.nombre_jefe_inmediato = req.user.usuario;
    solicitud.aprobado_jefe_por = req.user.id;
    solicitud.aprobado_jefe_at = new Date();
    solicitud.obs_jefe = observaciones || null;
    solicitud.estado = aprobado ? 'pendiente_secretario' : 'rechazada';
    solicitud.firma_jefe_inmediato = req.body.firma_jefe_inmediato ?? solicitud.firma_jefe_inmediato;

    await solicitud.save();
    res.json(solicitud);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/aprobar-secretario', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { aprobado, seAjustaALaLey, observaciones } = req.body;

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

    if (solicitud.estado !== 'pendiente_secretario') {
      return res.status(400).json({ error: 'El jefe debe aprobar primero la solicitud' });
    }

    const puede = await esSecretarioDeSecretaria(req.user.id, solicitud.dependencia_id);
    if (!puede) {
      const area = await Dependencia.findByPk(solicitud.dependencia_id);
      return res.status(403).json({
        error: 'No eres el secretario correspondiente',
        detalle: {
          solicitud_id: solicitud.id,
          area_id: area?.id,
          area_nombre: area?.nombre,
          tu_usuario_id: req.user.id
        }
      });
    }

    solicitud.nombre_secretario = req.user.usuario;
    solicitud.aprobado_secretario_por = req.user.id;
    solicitud.aprobado_secretario_at = new Date();
    solicitud.obs_secretario = observaciones || null;
    solicitud.firma_secretario = req.body.firma_secretario ?? solicitud.firma_secretario;

    const ok = (aprobado === true || aprobado === 'true' || aprobado === 1 || aprobado === '1');
    solicitud.estado = ok ? 'aprobada' : 'rechazada';

    const ajusta = (seAjustaALaLey === true || seAjustaALaLey === 'true' || seAjustaALaLey === 1 || seAjustaALaLey === '1');
    solicitud.ajusta_ley_si = ok ? ajusta : false;
    solicitud.ajusta_ley_no = ok ? !ajusta : false;

    await solicitud.save();
    res.json({ message: 'Revisión del secretario registrada', solicitud });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Bandejas ----------
router.get('/mis-solicitudes', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const areasJefe = await Dependencia.findAll({ where: { jefe_usuario_id: userId } });
    const secs = await Dependencia.findAll({ where: { secretario_usuario_id: userId } });

    let where = {};
    if (areasJefe.length === 0 && secs.length === 0) {
      where = { usuarioId: userId };
    } else if (areasJefe.length > 0) {
      const idsAreas = areasJefe.map(a => a.id);
      where = { dependencia_id: { [Op.in]: idsAreas } };
    }

    if (secs.length > 0) {
      const idsSecretarias = secs.map(s => s.id);
      const areasHijas = await Dependencia.findAll({
        where: { dependencia_padre_id: { [Op.in]: idsSecretarias } },
        attributes: ['id']
      });
      const idsAreasHijas = areasHijas.map(a => a.id);
      where = { dependencia_id: { [Op.in]: idsAreasHijas }, estado: 'pendiente_secretario' };
    }

    const solicitudes = await Solicitud.findAll({
      where,
      order: [['fecha', 'DESC']]
    });

    res.json(solicitudes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =========  
   IMPORTANTE: rutas específicas ANTES de '/:id'
   ========= */

// ---------- Board (Jefe/Secretario) ----------
router.get('/board', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Áreas visibles por JEFE / SECRETARIO
    const areasJefe = await Dependencia.findAll({ where: { jefe_usuario_id: userId } });
    const secretarias = await Dependencia.findAll({ where: { secretario_usuario_id: userId } });

    if (areasJefe.length === 0 && secretarias.length === 0) {
      return res.status(403).json({ error: 'Solo Jefe o Secretario pueden ver el tablero' });
    }

    const idsAreasJefe = areasJefe.map(a => a.id);
    let idsAreasSecretario = [];
    if (secretarias.length > 0) {
      const idsSecretarias = secretarias.map(s => s.id);
      const areasHijas = await Dependencia.findAll({
        where: { dependencia_padre_id: { [Op.in]: idsSecretarias } },
        attributes: ['id']
      });
      idsAreasSecretario = areasHijas.map(a => a.id);
    }

    const areaIds = Array.from(new Set([...idsAreasJefe, ...idsAreasSecretario]));
    if (areaIds.length === 0) {
      return res.json({
        totals: {},
        byArea: [],
        items: [],
        areas: [],
        pagination: { page: 1, pages: 1, count: 0, limit: 50 }
      });
    }

    // ------------ Filtros / querystring ------------
    const {
      estado,            // "pendiente_jefe,aprobada"
      areaId,            // id numérico
      q,                 // texto libre multi-palabra
      from,              // fecha inicio
      to,                // fecha fin
      page = '1',
      limit = '50',
      sort = 'fecha',    // solo permitimos algunos campos
      dir = 'DESC'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const whereBase = { dependencia_id: { [Op.in]: areaIds } };

    // Estado(s)
    if (estado) {
      const estados = String(estado).split(',').map(s => s.trim()).filter(Boolean);
      if (estados.length) whereBase.estado = { [Op.in]: estados };
    }

    // Filtro por área específica
    if (areaId && !Number.isNaN(Number(areaId))) {
      whereBase.dependencia_id = Number(areaId);
    }

    // 🔎 BÚSQUEDA multi-palabra: nombre completo/usuario/cédula/motivo
    if (q && q.trim()) {
      const tokens = q.trim().split(/\s+/).filter(Boolean);
      const andClauses = tokens.map(t => {
        const like = `%${t}%`;
        return {
          [Op.or]: [
            { nombre_completo:   { [Op.like]: like } },
            { motivo:            { [Op.like]: like } },
            { cedula:            { [Op.like]: like } },
            { '$usuario.nombre$':  { [Op.like]: like } },
            { '$usuario.usuario$': { [Op.like]: like } },
          ]
        };
      });
      whereBase[Op.and] = [...(whereBase[Op.and] || []), ...andClauses];
    }

    // Rango de fechas
    if (from || to) {
      const f = from ? new Date(from) : null;
      const t = to ? new Date(to) : null;
      if (f && t) whereBase.fecha = { [Op.between]: [f, t] };
      else if (f) whereBase.fecha = { [Op.gte]: f };
      else if (t) whereBase.fecha = { [Op.lte]: t };
    }

    // ------------ Agregados (sobre TODO el match) ------------
    const agg = await Solicitud.findAll({
      where: whereBase,
      attributes: [
        'estado',
        'dependencia_id',
        [sequelize.fn('COUNT', sequelize.col('Solicitud.id')), 'total']
      ],
      group: ['estado', 'dependencia_id'],
      include: [
        { model: Dependencia, as: 'dependencia', attributes: ['id', 'nombre'] },
        // IMPORTANTE: incluir usuario (aunque sin columnas) para habilitar '$usuario.*$' en where
        { model: Usuario, as: 'usuario', attributes: [], required: false },
      ],
    });

    const totals = { pendiente_jefe: 0, pendiente_secretario: 0, aprobada: 0, rechazada: 0 };
    const byAreaMap = new Map();

    for (const r of agg) {
      const est = r.get('estado');
      const tot = parseInt(r.get('total'), 10) || 0;
      const areaName = r.get('dependencia')?.nombre || '—';

      if (totals.hasOwnProperty(est)) totals[est] += tot;

      if (!byAreaMap.has(areaName)) {
        byAreaMap.set(areaName, {
          area: areaName,
          pendiente_jefe: 0,
          pendiente_secretario: 0,
          aprobada: 0,
          rechazada: 0,
          total: 0,
        });
      }
      const row = byAreaMap.get(areaName);
      if (row.hasOwnProperty(est)) row[est] += tot;
      row.total += tot;
    }
    const byArea = Array.from(byAreaMap.values()).sort((a, b) => b.total - a.total);

    // ------------ Items (paginados) ------------
    const ALLOWED_SORT = new Set(['fecha', 'id', 'estado']);
    const sortField = ALLOWED_SORT.has(String(sort)) ? String(sort) : 'fecha';
    const dirSql = String(dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [[sortField, dirSql]];

    const { rows, count } = await Solicitud.findAndCountAll({
      where: whereBase,
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'usuario', 'nombre', 'cedula'] },
        { model: Dependencia, as: 'dependencia', attributes: ['id', 'nombre'] },
      ],
      order,
      offset: (pageNum - 1) * pageSize,
      limit: pageSize
    });

    // Áreas visibles (para combos)
    const areasVisibles = await Dependencia.findAll({
      where: { id: { [Op.in]: areaIds } },
      attributes: ['id', 'nombre'],
      order: [['nombre', 'ASC']]
    });

    res.json({
      totals,
      byArea,
      items: rows,
      areas: areasVisibles,
      pagination: {
        page: pageNum,
        pages: Math.max(Math.ceil(count / pageSize), 1),
        count,
        limit: pageSize
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error construyendo el tablero' });
  }
});


// ---------- Estadísticas simples ----------
router.get('/estadisticas', auth, async (req, res) => {
  try {
    const stats = await Solicitud.findAll({
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      group: ['estado']
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Word (usar antes que '/:id' también, por si acaso) ----------
router.get('/:id/word', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const s = await Solicitud.findByPk(id, {
      include: [
        { model: Usuario, as: 'usuario' },
        { model: Usuario, as: 'jefe' },
        { model: Usuario, as: 'secretario' },
        { model: Dependencia, as: 'dependencia' },
      ],
    });
    if (!s) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (s.estado !== 'aprobada') {
      return res.status(400).json({ error: 'Solo se puede descargar cuando está aprobada' });
    }

    const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-CO') : '');
    const ctx = {
      fecha: s.fecha ? new Date(s.fecha).toLocaleDateString('es-CO') : '',
      nombre_completo: s.nombre_completo || s.usuario?.nombre || '',
      cedula: s.cedula || s.usuario?.cedula || '',
      cargo: s.cargo || '',
      dependencia_id: s.dependencia?.nombre || '', // <-- FIX aquí
      area_trabajo: s.area_trabajo || '',
      estudios: s.estudios ? 'X' : '',
      cita_medica: s.cita_medica ? 'X' : '',
      licencia: s.licencia ? 'X' : '',
      compensatorio: s.compensatorio ? 'X' : '',
      otro: s.otro ? 'X' : '',
      motivo: s.motivo || '',

      numero_dias: s.numero_dias ?? '',
      numero_horas: s.numero_horas ?? '',
      dia_inicio: fmtFecha(s.dia_inicio),
      dia_fin: fmtFecha(s.dia_fin),
      hora_inicio: s.hora_inicio || '',
      hora_fin: s.hora_fin || '',

      obs_jefe: s.obs_jefe || '',
      obs_secretario: s.obs_secretario || '',

      ajusta_ley_si: s.ajusta_ley_si ? 'X' : '',
      ajusta_ley_no: s.ajusta_ley_no ? 'X' : '',

      nombre_jefe_inmediato: s.nombre || s.jefe?.nombre || '',
      nombre_secretario: s.nombre || s.secretario?.nombre || '',
      firma_solicitante: s.firma_solicitante || '',
      firma_jefe_inmediato: s.firma_jefe_inmediato || '',
      firma_secretario: s.firma_secretario || '',
    };

    const templatePath = path.join(__dirname, '../templates', 'A-GTH-F-17 Ausentismo Laboral.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const BLANK_PX = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/azl4wAAAABJRU5ErkJggg==',
      'base64'
    );

    const imageModule = new ImageModule({
      centered: false,
      getImage(tagValue) {
        if (!tagValue) return BLANK_PX;
        const b64 = String(tagValue).includes(',') ? String(tagValue).split(',')[1] : String(tagValue);
        try { return Buffer.from(b64, 'base64'); } catch { return BLANK_PX; }
      },
      getSize(img) {
        try {
          const dim = sizeOf(img);
          const maxW = 400, maxH = 150;
          let { width: w, height: h } = dim;
          if (!w || !h) return [200, 60];
          const r = Math.min(maxW / w, maxH / h, 1);
          return [Math.round(w * r), Math.round(h * r)];
        } catch {
          return [200, 60];
        }
      },
    });

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '<<', end: '>>' },
      modules: [imageModule],
    });

    doc.setData(ctx);
    doc.render();

    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="A-GTH-F-17 Ausentismo Laboral_${s.id}.docx"`);
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error generando el documento' });
  }
});

// ---------- Detalle por ID (última) ----------
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const sol = await Solicitud.findByPk(id, {
      include: [
        { model: Usuario, as: 'usuario',    attributes: ['id', 'usuario', 'nombre', 'cedula'] },
        { model: Usuario, as: 'jefe',       attributes: ['id', 'usuario', 'nombre'] },
        { model: Usuario, as: 'secretario', attributes: ['id', 'usuario', 'nombre'] },
        { model: Dependencia, as: 'dependencia', attributes: ['id', 'nombre'] },
      ],
    });
    if (!sol) return res.status(404).json({ error: 'No encontrada' });
    res.json(sol);
  } catch (e) {
    console.error('SQL MSG:', e?.parent?.sqlMessage || e?.original?.sqlMessage || e.message);
    res.status(500).json({ error: 'Error cargando solicitud' });
  }
});

module.exports = router;
