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

    // --------- ADMIN por variable de entorno ----------
    const adminList = (process.env.ADMIN_USERS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const isAdminUser = adminList.includes((req.user?.usuario || '').toLowerCase());

    // --------- Query params ----------
    const {
      estado,            // csv: "pendiente_jefe,aprobada"
      q,                 // texto libre
      from,              // YYYY-MM-DD
      to,                // YYYY-MM-DD
      secretariaId,      // id numérico (dependencia raíz)
      areaId,            // id numérico (dependencia hija)
      page = '1',
      limit = '50',
      sort = 'fecha',    // 'fecha' | 'id' | 'estado'
      dir = 'DESC'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    // --------- Visibilidad de secretarías y áreas por rol ----------
    // Secretarías visibles:
    // - ADMIN: todas las dependencias raíz (sin dependencia_padre_id)
    // - SECRETARIO: donde es secretario
    // - JEFE: las secretarías "padre" de sus áreas
    let secretariasVisibles = [];
    if (isAdminUser) {
      secretariasVisibles = await Dependencia.findAll({
        where: { dependencia_padre_id: null },
        attributes: ['id', 'nombre'],
        order: [['nombre', 'ASC']]
      });
    } else {
      // SECRETARÍAS donde el usuario es secretario
      const secretariasPropias = await Dependencia.findAll({
        where: { secretario_usuario_id: userId, dependencia_padre_id: null },
        attributes: ['id', 'nombre']
      });

      // ÁREAS donde el usuario es jefe → obtener su secretaria padre
      const areasJefe = await Dependencia.findAll({
        where: { jefe_usuario_id: userId, dependencia_padre_id: { [Op.ne]: null } },
        attributes: ['id', 'dependencia_padre_id']
      });

      let padresIds = [];
      if (areasJefe.length > 0) {
        const padreIds = Array.from(new Set(areasJefe.map(a => a.dependencia_padre_id)));
        const padres = await Dependencia.findAll({
          where: { id: { [Op.in]: padreIds }, dependencia_padre_id: null },
          attributes: ['id', 'nombre']
        });
        padresIds = padres.map(p => p.id);
        // merge secretarías (secretario + padres de jefaturas)
        const mapSec = new Map();
        for (const s of [...secretariasPropias, ...padres]) mapSec.set(s.id, s);
        secretariasVisibles = Array.from(mapSec.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
      } else {
        secretariasVisibles = secretariasPropias.sort((a, b) => a.nombre.localeCompare(b.nombre));
      }
    }

    // Áreas visibles según secretariaId:
    // - Si NO hay secretariaId => por UI pedida, no listamos áreas ([])
    // - Si hay secretariaId:
    //   - ADMIN: todas las hijas de esa secretaría
    //   - SECRETARIO: todas las hijas de sus secretarías, pero si pidió secretariaId, solo de esa
    //   - JEFE: intersección entre sus áreas y las hijas de esa secretaría
    let areasVisibles = [];
    let areaIdsAutorizados = []; // ids de áreas para filtrar datos si aplica

    // Utilidad: obtener hijas de una secretaría
    async function getAreasHijas(secId) {
      const rows = await Dependencia.findAll({
        where: { dependencia_padre_id: Number(secId) },
        attributes: ['id', 'nombre'],
        order: [['nombre', 'ASC']]
      });
      return rows;
    }

    if (secretariaId && !Number.isNaN(Number(secretariaId))) {
      const secIdNum = Number(secretariaId);

      if (isAdminUser) {
        // ADMIN: todas las hijas de esa secretaría
        const hijas = await getAreasHijas(secIdNum);
        areasVisibles = hijas;
        areaIdsAutorizados = hijas.map(a => a.id);
      } else {
        // No admin:
        // 1) Secretarías del usuario (secretario + padres de áreas jefe)
        const misSecretariasIds = new Set(secretariasVisibles.map(s => s.id));
        const esMiSecretaria = misSecretariasIds.has(secIdNum);

        if (!esMiSecretaria) {
          // No tiene acceso a esta secretaría
          areasVisibles = [];
          areaIdsAutorizados = []; // filtrará a vacío si se usa
        } else {
          const hijas = await getAreasHijas(secIdNum);

          // Si es SECRETARIO de esta, tiene todas sus áreas hijas:
          const soySecretarioDeEsta = !isAdminUser && (
            await Dependencia.count({
              where: { id: secIdNum, secretario_usuario_id: userId, dependencia_padre_id: null }
            })
          ) > 0;

          if (soySecretarioDeEsta) {
            areasVisibles = hijas;
            areaIdsAutorizados = hijas.map(a => a.id);
          } else {
            // JEFE: intersección entre sus áreas (como jefe) y las hijas de esta secretaría
            const misAreasJefe = await Dependencia.findAll({
              where: { jefe_usuario_id: userId, dependencia_padre_id: { [Op.ne]: null } },
              attributes: ['id', 'dependencia_padre_id']
            });
            const misAreasJefeSet = new Set(misAreasJefe.map(a => a.id));
            const hijasFiltradas = hijas.filter(h => misAreasJefeSet.has(h.id));
            areasVisibles = hijasFiltradas;
            areaIdsAutorizados = hijasFiltradas.map(a => a.id);
          }
        }
      }
    } else {
      // Sin secretariaId: por UI pedida, no devolvemos áreas
      areasVisibles = [];
      areaIdsAutorizados = []; // se decidirá abajo cómo filtrar datos
    }

    // --------- whereBase (filtro de datos) ----------
    const whereBase = {};

    // Si NO hay secretariaId ni areaId:
    //  - ADMIN: ve todo (todas las áreas hijas de todas las secretarías)
    //  - SECRETARIO: todas las áreas hijas de sus secretarías
    //  - JEFE: solo sus áreas
    if (!secretariaId && !areaId) {
      if (!isAdminUser) {
        // Secretarios: todas las hijas de sus secretarías
        const misSecretariasIds = secretariasVisibles.map(s => s.id);
        const hijas = (misSecretariasIds.length > 0)
          ? await Dependencia.findAll({
              where: { dependencia_padre_id: { [Op.in]: misSecretariasIds } },
              attributes: ['id']
            })
          : [];
        // Jefes: sus áreas
        const misAreasJefe = await Dependencia.findAll({
          where: { jefe_usuario_id: userId, dependencia_padre_id: { [Op.ne]: null } },
          attributes: ['id']
        });

        const idsSecretario = new Set(hijas.map(h => h.id));
        const idsJefe = new Set(misAreasJefe.map(a => a.id));
        const union = new Set([...idsSecretario, ...idsJefe]);

        if (union.size === 0) {
          return res.json({
            totals: {},
            byArea: [],
            items: [],
            secretarias: secretariasVisibles,
            areas: [],
            pagination: { page: 1, pages: 1, count: 0, limit: pageSize }
          });
        }
        whereBase.dependencia_id = { [Op.in]: Array.from(union) };
      } // ADMIN no limita aquí (ve todo)
    }

    // Si hay secretariaId pero NO hay areaId:
    // - Si ya calculamos areaIdsAutorizados arriba (hijas visibles según rol)
    if (secretariaId && !areaId) {
      whereBase.dependencia_id = { [Op.in]: areaIdsAutorizados.length ? areaIdsAutorizados : [-1] }; // -1 para vaciar
    }

    // Si hay areaId → filtrar a esa área concreta, pero verificamos acceso
    if (areaId && !Number.isNaN(Number(areaId))) {
      const areaNum = Number(areaId);
      if (isAdminUser) {
        whereBase.dependencia_id = areaNum;
      } else {
        // No admin: comprobar si esa área está dentro de areasVisibles (cuando hay secretaria) o dentro de su universo (cuando no hay secretaria)
        let allowed = false;
        if (secretariaId) {
          allowed = areasVisibles.some(a => a.id === areaNum);
        } else {
          // Sin secretariaId: comprobar si es área propia (jefe) o hija de sus secretarías (secretario)
          const esJefeDeArea = await Dependencia.count({
            where: { id: areaNum, jefe_usuario_id: userId, dependencia_padre_id: { [Op.ne]: null } }
          });
          if (esJefeDeArea > 0) allowed = true;

          if (!allowed) {
            // es hija de alguna secretaría donde soy secretario?
            const misSecretariasIds = secretariasVisibles.map(s => s.id);
            const countHijaDeMisSec = await Dependencia.count({
              where: { id: areaNum, dependencia_padre_id: { [Op.in]: misSecretariasIds } }
            });
            if (countHijaDeMisSec > 0) allowed = true;
          }
        }

        if (!allowed) {
          // sin acceso → colección vacía
          whereBase.dependencia_id = -1; // forzamos vacío
        } else {
          whereBase.dependencia_id = areaNum;
        }
      }
    }

    // Estado(s)
    if (estado) {
      const estados = String(estado).split(',').map(s => s.trim()).filter(Boolean);
      if (estados.length) whereBase.estado = { [Op.in]: estados };
    }

    // 🔎 Búsqueda multi-palabra
    if (q && q.trim()) {
      const tokens = q.trim().split(/\s+/).filter(Boolean);
      const andClauses = tokens.map(t => {
        const like = `%${t}%`;
        return {
          [Op.or]: [
            { nombre_completo:     { [Op.like]: like } },
            { motivo:              { [Op.like]: like } },
            { cedula:              { [Op.like]: like } },
            { '$usuario.nombre$':  { [Op.like]: like } },
            { '$usuario.usuario$': { [Op.like]: like } },
          ]
        };
      });
      whereBase[Op.and] = [...(whereBase[Op.and] || []), ...andClauses];
    }

    // Rango de fechas (to inclusivo hasta 23:59:59.999)
    if (from || to) {
      const f = from ? new Date(from) : null;
      let t = to ? new Date(to) : null;
      if (t) t.setHours(23, 59, 59, 999);
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
      group: ['estado', 'dependencia_id', 'dependencia.id', 'dependencia.nombre'],
      include: [
        { model: Dependencia, as: 'dependencia', attributes: ['id', 'nombre'] },
        { model: Usuario, as: 'usuario', attributes: [], required: false }, // habilita $usuario.*$ en where
      ],
      raw: false
    });

    const totals = { pendiente_jefe: 0, pendiente_secretario: 0, aprobada: 0, rechazada: 0 };
    const byAreaMap = new Map();

    for (const r of agg) {
      const est = r.get('estado');
      const tot = parseInt(r.get('total'), 10) || 0;
      const areaName = r.get('dependencia')?.nombre || '—';

      if (Object.prototype.hasOwnProperty.call(totals, est)) totals[est] += tot;

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
      if (Object.prototype.hasOwnProperty.call(row, est)) row[est] += tot;
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

    // --------- Construir respuesta ----------
    res.json({
      totals,
      byArea,
      items: rows,
      // Secretarías visibles SIEMPRE (para el combo)
      secretarias: secretariasVisibles,
      // Áreas visibles SOLO si hay secretariaId (para el combo)
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
