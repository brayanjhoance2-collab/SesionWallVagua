const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const obtenerWallpapers = async (req, res) => {
  try {
    const { categoria, limite = 20, pagina = 1, buscar } = req.query;
    const offset = (pagina - 1) * limite;

    let query = `
      SELECT w.*, c.nombre as nombre_categoria, e.total_vistas, e.total_descargas, e.total_favoritos
      FROM wallpapers w
      LEFT JOIN categorias c ON w.categoria_id = c.id
      LEFT JOIN estadisticas_wallpapers e ON w.id = e.wallpaper_id
      WHERE w.activo = TRUE
    `;
    
    const params = [];

    if (categoria) {
      query += ' AND w.categoria_id = ?';
      params.push(categoria);
    }

    if (buscar) {
      query += ' AND (w.titulo LIKE ? OR w.etiquetas LIKE ?)';
      params.push(`%${buscar}%`, `%${buscar}%`);
    }

    query += ' ORDER BY w.fecha_subida DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const [wallpapers] = await db.query(query, params);

    const [totalResult] = await db.query(
      'SELECT COUNT(*) as total FROM wallpapers WHERE activo = TRUE'
    );

    return exitoRespuesta(res, 'Wallpapers obtenidos', {
      wallpapers,
      paginacion: {
        total: totalResult[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(totalResult[0].total / limite)
      }
    });
  } catch (error) {
    console.error('Error obteniendo wallpapers:', error);
    return errorRespuesta(res, 'Error al obtener wallpapers', 500);
  }
};

const obtenerWallpaperPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [wallpapers] = await db.query(`
      SELECT w.*, c.nombre as nombre_categoria, e.total_vistas, e.total_descargas, e.total_favoritos
      FROM wallpapers w
      LEFT JOIN categorias c ON w.categoria_id = c.id
      LEFT JOIN estadisticas_wallpapers e ON w.id = e.wallpaper_id
      WHERE w.id = ? AND w.activo = TRUE
    `, [id]);

    if (wallpapers.length === 0) {
      return errorRespuesta(res, 'Wallpaper no encontrado', 404);
    }

    await db.query(
      'INSERT INTO estadisticas_wallpapers (wallpaper_id, total_vistas) VALUES (?, 1) ON DUPLICATE KEY UPDATE total_vistas = total_vistas + 1',
      [id]
    );

    return exitoRespuesta(res, 'Wallpaper obtenido', wallpapers[0]);
  } catch (error) {
    console.error('Error obteniendo wallpaper:', error);
    return errorRespuesta(res, 'Error al obtener wallpaper', 500);
  }
};

const obtenerTendencias = async (req, res) => {
  try {
    const { limite = 10 } = req.query;

    const [wallpapers] = await db.query(`
      SELECT w.*, c.nombre as nombre_categoria, e.total_vistas, e.total_descargas, e.total_favoritos
      FROM wallpapers w
      LEFT JOIN categorias c ON w.categoria_id = c.id
      LEFT JOIN estadisticas_wallpapers e ON w.id = e.wallpaper_id
      WHERE w.activo = TRUE
      ORDER BY (e.total_vistas * 0.3 + e.total_descargas * 0.5 + e.total_favoritos * 0.2) DESC
      LIMIT ?
    `, [parseInt(limite)]);

    return exitoRespuesta(res, 'Tendencias obtenidas', wallpapers);
  } catch (error) {
    console.error('Error obteniendo tendencias:', error);
    return errorRespuesta(res, 'Error al obtener tendencias', 500);
  }
};

const obtenerRecomendados = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { limite = 10 } = req.query;

    const [gustos] = await db.query(
      'SELECT categoria FROM gustos_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    if (gustos.length === 0) {
      return obtenerTendencias(req, res);
    }

    const categorias = gustos.map(g => g.categoria);

    const [wallpapers] = await db.query(`
      SELECT w.*, c.nombre as nombre_categoria, e.total_vistas, e.total_descargas
      FROM wallpapers w
      LEFT JOIN categorias c ON w.categoria_id = c.id
      LEFT JOIN estadisticas_wallpapers e ON w.id = e.wallpaper_id
      WHERE w.activo = TRUE AND c.nombre IN (?)
      ORDER BY RAND()
      LIMIT ?
    `, [categorias, parseInt(limite)]);

    return exitoRespuesta(res, 'Recomendaciones obtenidas', wallpapers);
  } catch (error) {
    console.error('Error obteniendo recomendaciones:', error);
    return errorRespuesta(res, 'Error al obtener recomendaciones', 500);
  }
};

module.exports = {
  obtenerWallpapers,
  obtenerWallpaperPorId,
  obtenerTendencias,
  obtenerRecomendados
};