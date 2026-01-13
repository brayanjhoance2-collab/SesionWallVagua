const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const obtenerCategorias = async (req, res) => {
  try {
    const [categorias] = await db.query(
      'SELECT * FROM categorias WHERE activa = TRUE ORDER BY orden ASC, nombre ASC'
    );

    return exitoRespuesta(res, 'Categorías obtenidas', categorias);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    return errorRespuesta(res, 'Error al obtener categorías', 500);
  }
};

const obtenerCategoriaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [categorias] = await db.query(
      'SELECT * FROM categorias WHERE id = ? AND activa = TRUE',
      [id]
    );

    if (categorias.length === 0) {
      return errorRespuesta(res, 'Categoría no encontrada', 404);
    }

    const [wallpapers] = await db.query(
      'SELECT COUNT(*) as total FROM wallpapers WHERE categoria_id = ? AND activo = TRUE',
      [id]
    );

    return exitoRespuesta(res, 'Categoría obtenida', {
      categoria: categorias[0],
      totalWallpapers: wallpapers[0].total
    });
  } catch (error) {
    console.error('Error obteniendo categoría:', error);
    return errorRespuesta(res, 'Error al obtener categoría', 500);
  }
};

module.exports = {
  obtenerCategorias,
  obtenerCategoriaPorId
};