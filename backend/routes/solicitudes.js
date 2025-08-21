// routes/solicitudes.js
const { Op } = require('sequelize');
const router = require('express').Router();

const Solicitud = require('../models/Solicitud');
const Usuario = require('../models/Usuario');
const Dependencia = require('../models/Dependencia');
const auth = require('../middleware/auth');
const { esJefeDeArea, esSecretarioDeSecretaria } = require('../lib/permiso');

//Crea una nueva solicitud
router.post('/', auth, async (req, res) => {
  try { 
    const user = await Usuario.findByPk(req.user.id);
    if (!user) return res.status(401).json({ error: 'Usuario no válido' });

    const b = v => (v === true || v === 'true' || v === 1 || v === '1');

    const {
      nombre_completo, cedula, cargo, secretaria_oficina, area_trabajo,
      estudios, cita_medica, licencia, compensatorio, otro, motivo,
      fecha_horas, numero_horas, hora_inicio, hora_fin,
      numero_dias, dia_inicio, dia_fin
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

      estado: 'pendiente_jefe'
    });

    res.json(nueva);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


function studiosToBool(v) {
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  return false;
}

router.put('/:id/aprobar-jefe', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { aprobadoJefe, observaciones } = req.body;
    const aprobado = 
    (aprobadoJefe === true || aprobadoJefe === 'true' 
      || aprobadoJefe === 1 || aprobadoJefe === '1');

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) 
    return res.status(404).json(
      { error: 'Solicitud no encontrada' }
    );

    if (solicitud.estado !== 'pendiente_jefe') {
      return res.status(400).json({ error: 'La solicitud no está pendiente del jefe' });
    }

    // Autorización: jefe del área
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

    // Auditoría jefe
    solicitud.nombre_jefe_inmediato = req.user.usuario;
    solicitud.aprobado_jefe_por = req.user.id;
    solicitud.aprobado_jefe_at = new Date();
    solicitud.obs_jefe = observaciones || null;

    solicitud.estado = aprobado ? 'pendiente_secretario' : 'rechazada';

    await solicitud.save();
    res.json(solicitud);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/** Aprobar/Rechazar Secretario (de la secretaría padre) */
router.put('/:id/aprobar-secretario', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { aprobado, seAjustaALaLey, observaciones } = req.body;

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

    // Debe venir del jefe
    if (solicitud.estado !== 'pendiente_secretario') {
      return res.status(400).json({ error: 'El jefe debe aprobar primero la solicitud' });
    }

    // Autorización: secretario de la secretaría padre
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

    // Auditoría secretario
    solicitud.nombre_secretario = req.user.usuario;
    solicitud.aprobado_secretario_por = req.user.id;
    solicitud.aprobado_secretario_at = new Date();
    solicitud.obs_secretario = observaciones || null;

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


/** Bandejas:
 * - Empleado: sus solicitudes
 * - Jefe: solicitudes del área donde es jefe (estado cualquiera)
 * - Secretario: solo pendientes de su secretaría (áreas hijas)
 */
router.get('/mis-solicitudes', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // ¿Es jefe de alguna área?
    const areasJefe = await Dependencia.findAll({ where: { jefe_usuario_id: userId } });
    // ¿Es secretario de alguna secretaría?
    const secs = await Dependencia.findAll({ where: { secretario_usuario_id: userId } });

    let where = {};
    if (areasJefe.length === 0 && secs.length === 0) {
      // Empleado
      where = { usuarioId: userId };
    } else if (areasJefe.length > 0) {
      // Jefe ve solicitudes de sus áreas
      const idsAreas = areasJefe.map(a => a.id);
      where = { dependencia_id: { [Op.in]: idsAreas } };
    }

    if (secs.length > 0) {
      // Secretario ve solo pendientes de sus áreas hijas
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

module.exports = router;
