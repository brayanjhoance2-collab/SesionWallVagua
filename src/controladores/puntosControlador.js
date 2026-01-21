const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const obtenerPuntos = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const [usuario] = await db.query(
      'SELECT puntos FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (usuario.length === 0) {
      return errorRespuesta(res, 'Usuario no encontrado', 404);
    }

    return exitoRespuesta(res, 'Puntos obtenidos', {
      puntos: usuario[0].puntos
    });
  } catch (error) {
    console.error('Error obteniendo puntos:', error);
    return errorRespuesta(res, 'Error al obtener puntos', 500);
  }
};

const obtenerHistorialPuntos = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { limite = 20, pagina = 1 } = req.query;
    const offset = (pagina - 1) * limite;

    const [historial] = await db.query(
      `SELECT hp.*, ep.nombre as evento_nombre, ep.descripcion as evento_descripcion 
      FROM historial_puntos hp 
      LEFT JOIN eventos_puntos ep ON hp.evento_id = ep.id 
      WHERE hp.usuario_id = ? 
      ORDER BY hp.fecha_movimiento DESC 
      LIMIT ? OFFSET ?`,
      [usuarioId, parseInt(limite), parseInt(offset)]
    );

    const [total] = await db.query(
      'SELECT COUNT(*) as total FROM historial_puntos WHERE usuario_id = ?',
      [usuarioId]
    );

    return exitoRespuesta(res, 'Historial de puntos obtenido', {
      historial,
      paginacion: {
        total: total[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(total[0].total / limite)
      }
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return errorRespuesta(res, 'Error al obtener historial de puntos', 500);
  }
};

const obtenerEventosPuntos = async (req, res) => {
  try {
    const [eventos] = await db.query(
      'SELECT * FROM eventos_puntos WHERE activo = TRUE ORDER BY puntos_otorgados DESC'
    );

    return exitoRespuesta(res, 'Eventos de puntos obtenidos', eventos);
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    return errorRespuesta(res, 'Error al obtener eventos de puntos', 500);
  }
};

module.exports = {
  obtenerPuntos,
  obtenerHistorialPuntos,
  obtenerEventosPuntos
};