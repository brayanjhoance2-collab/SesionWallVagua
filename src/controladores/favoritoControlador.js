const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const agregarFavorito = async (req, res) => {
  try {
    const { 
      wallpaperId, 
      titulo, 
      urlImagen, 
      urlThumbnail, 
      categoriaNombre,
      resolucion,
      mimeType,
      tipoWallpaper,
      esPremium
    } = req.body;
    const usuarioId = req.usuarioId;

    const [existente] = await db.query(
      'SELECT id FROM favoritos WHERE usuario_id = ? AND wallpaper_id = ?',
      [usuarioId, wallpaperId]
    );

    if (existente.length > 0) {
      return errorRespuesta(res, 'El wallpaper ya está en favoritos', 400);
    }

    await db.query(
      `INSERT INTO favoritos 
      (usuario_id, wallpaper_id, titulo, url_imagen, url_thumbnail, categoria_nombre, resolucion, mime_type, tipo_wallpaper, es_premium) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, wallpaperId, titulo, urlImagen, urlThumbnail, categoriaNombre, resolucion, mimeType, tipoWallpaper, esPremium || false]
    );

    return exitoRespuesta(res, 'Wallpaper agregado a favoritos', null, 201);
  } catch (error) {
    console.error('Error agregando favorito:', error);
    return errorRespuesta(res, 'Error al agregar favorito', 500);
  }
};

const eliminarFavorito = async (req, res) => {
  try {
    const { wallpaperId } = req.params;
    const usuarioId = req.usuarioId;

    const [resultado] = await db.query(
      'DELETE FROM favoritos WHERE usuario_id = ? AND wallpaper_id = ?',
      [usuarioId, wallpaperId]
    );

    if (resultado.affectedRows === 0) {
      return errorRespuesta(res, 'Favorito no encontrado', 404);
    }

    return exitoRespuesta(res, 'Favorito eliminado');
  } catch (error) {
    console.error('Error eliminando favorito:', error);
    return errorRespuesta(res, 'Error al eliminar favorito', 500);
  }
};

const obtenerFavoritos = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { limite = 20, pagina = 1 } = req.query;
    const offset = (pagina - 1) * limite;

    const [favoritos] = await db.query(`
      SELECT 
        id as favorito_id,
        fecha_agregado,
        wallpaper_id,
        titulo,
        url_imagen,
        url_thumbnail,
        categoria_nombre,
        resolucion,
        mime_type,
        tipo_wallpaper,
        es_premium
      FROM favoritos
      WHERE usuario_id = ?
      ORDER BY fecha_agregado DESC
      LIMIT ? OFFSET ?
    `, [usuarioId, parseInt(limite), parseInt(offset)]);

    const [totalResult] = await db.query(
      'SELECT COUNT(*) as total FROM favoritos WHERE usuario_id = ?',
      [usuarioId]
    );

    return exitoRespuesta(res, 'Favoritos obtenidos', {
      favoritos,
      paginacion: {
        total: totalResult[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(totalResult[0].total / limite)
      }
    });
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    return errorRespuesta(res, 'Error al obtener favoritos', 500);
  }
};

const verificarFavorito = async (req, res) => {
  try {
    const { wallpaperId } = req.params;
    const usuarioId = req.usuarioId;

    const [favorito] = await db.query(
      'SELECT id FROM favoritos WHERE usuario_id = ? AND wallpaper_id = ?',
      [usuarioId, wallpaperId]
    );

    return exitoRespuesta(res, 'Estado de favorito', {
      esFavorito: favorito.length > 0
    });
  } catch (error) {
    console.error('Error verificando favorito:', error);
    return errorRespuesta(res, 'Error al verificar favorito', 500);
  }
};

module.exports = {
  agregarFavorito,
  eliminarFavorito,
  obtenerFavoritos,
  verificarFavorito
};