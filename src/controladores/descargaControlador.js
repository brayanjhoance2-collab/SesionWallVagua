const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const registrarDescarga = async (req, res) => {
  try {
    const { wallpaperId, calidadDescarga, dispositivo } = req.body;
    const usuarioId = req.usuarioId;

    await db.query(
      'INSERT INTO descargas (usuario_id, wallpaper_id, calidad_descarga, dispositivo) VALUES (?, ?, ?, ?)',
      [usuarioId, wallpaperId, calidadDescarga, dispositivo]
    );

    await db.query(
      'INSERT INTO estadisticas_wallpapers (wallpaper_id, total_descargas) VALUES (?, 1) ON DUPLICATE KEY UPDATE total_descargas = total_descargas + 1',
      [wallpaperId]
    );

    return exitoRespuesta(res, 'Descarga registrada', null, 201);
  } catch (error) {
    console.error('Error registrando descarga:', error);
    return errorRespuesta(res, 'Error al registrar descarga', 500);
  }
};

const obtenerHistorialDescargas = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { limite = 20, pagina = 1 } = req.query;
    const offset = (pagina - 1) * limite;

    const [descargas] = await db.query(`
      SELECT d.*, w.titulo, w.url_imagen, w.url_thumbnail, c.nombre as nombre_categoria
      FROM descargas d
      INNER JOIN wallpapers w ON d.wallpaper_id = w.id
      LEFT JOIN categorias c ON w.categoria_id = c.id
      WHERE d.usuario_id = ?
      ORDER BY d.fecha_descarga DESC
      LIMIT ? OFFSET ?
    `, [usuarioId, parseInt(limite), parseInt(offset)]);

    const [totalResult] = await db.query(
      'SELECT COUNT(*) as total FROM descargas WHERE usuario_id = ?',
      [usuarioId]
    );

    return exitoRespuesta(res, 'Historial de descargas obtenido', {
      descargas,
      paginacion: {
        total: totalResult[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(totalResult[0].total / limite)
      }
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return errorRespuesta(res, 'Error al obtener historial de descargas', 500);
  }
};

module.exports = {
  registrarDescarga,
  obtenerHistorialDescargas
};