const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const registrarDescarga = async (req, res) => {
  try {
    const { 
      wallpaperId, 
      titulo, 
      urlImagen, 
      urlThumbnail, 
      categoriaNombre,
      resolucion,
      mimeType,
      calidadDescarga, 
      dispositivo 
    } = req.body;
    const usuarioId = req.usuarioId;

    await db.query(
      `INSERT INTO descargas 
      (usuario_id, wallpaper_id, titulo, url_imagen, url_thumbnail, categoria_nombre, resolucion, mime_type, calidad_descarga, dispositivo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, wallpaperId, titulo, urlImagen, urlThumbnail, categoriaNombre, resolucion, mimeType, calidadDescarga || 'alta', dispositivo]
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
      SELECT 
        id,
        wallpaper_id,
        fecha_descarga,
        calidad_descarga,
        dispositivo,
        titulo,
        url_imagen,
        url_thumbnail,
        categoria_nombre,
        resolucion,
        mime_type
      FROM descargas
      WHERE usuario_id = ?
      ORDER BY fecha_descarga DESC
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