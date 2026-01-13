const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const obtenerNotificaciones = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { limite = 20, pagina = 1, soloNoLeidas } = req.query;
    const offset = (pagina - 1) * limite;

    let query = 'SELECT * FROM notificaciones WHERE usuario_id = ?';
    const params = [usuarioId];

    if (soloNoLeidas === 'true') {
      query += ' AND leida = FALSE';
    }

    query += ' ORDER BY fecha_envio DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const [notificaciones] = await db.query(query, params);

    const [totalResult] = await db.query(
      'SELECT COUNT(*) as total FROM notificaciones WHERE usuario_id = ?',
      [usuarioId]
    );

    const [noLeidasResult] = await db.query(
      'SELECT COUNT(*) as total FROM notificaciones WHERE usuario_id = ? AND leida = FALSE',
      [usuarioId]
    );

    return exitoRespuesta(res, 'Notificaciones obtenidas', {
      notificaciones,
      totalNoLeidas: noLeidasResult[0].total,
      paginacion: {
        total: totalResult[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(totalResult[0].total / limite)
      }
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return errorRespuesta(res, 'Error al obtener notificaciones', 500);
  }
};

const marcarComoLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId;

    const [resultado] = await db.query(
      'UPDATE notificaciones SET leida = TRUE, fecha_lectura = NOW() WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );

    if (resultado.affectedRows === 0) {
      return errorRespuesta(res, 'Notificación no encontrada', 404);
    }

    return exitoRespuesta(res, 'Notificación marcada como leída');
  } catch (error) {
    console.error('Error marcando notificación:', error);
    return errorRespuesta(res, 'Error al marcar notificación', 500);
  }
};

const marcarTodasComoLeidas = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    await db.query(
      'UPDATE notificaciones SET leida = TRUE, fecha_lectura = NOW() WHERE usuario_id = ? AND leida = FALSE',
      [usuarioId]
    );

    return exitoRespuesta(res, 'Todas las notificaciones marcadas como leídas');
  } catch (error) {
    console.error('Error marcando notificaciones:', error);
    return errorRespuesta(res, 'Error al marcar notificaciones', 500);
  }
};

const eliminarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId;

    const [resultado] = await db.query(
      'DELETE FROM notificaciones WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );

    if (resultado.affectedRows === 0) {
      return errorRespuesta(res, 'Notificación no encontrada', 404);
    }

    return exitoRespuesta(res, 'Notificación eliminada');
  } catch (error) {
    console.error('Error eliminando notificación:', error);
    return errorRespuesta(res, 'Error al eliminar notificación', 500);
  }
};

module.exports = {
  obtenerNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion
};