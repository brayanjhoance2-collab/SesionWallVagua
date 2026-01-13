const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const crearColeccion = async (req, res) => {
  try {
    const { nombre, descripcion, publica } = req.body;
    const usuarioId = req.usuarioId;

    const [resultado] = await db.query(
      'INSERT INTO colecciones (usuario_id, nombre, descripcion, publica) VALUES (?, ?, ?, ?)',
      [usuarioId, nombre, descripcion, publica || false]
    );

    return exitoRespuesta(res, 'Colección creada', { coleccionId: resultado.insertId }, 201);
  } catch (error) {
    console.error('Error creando colección:', error);
    return errorRespuesta(res, 'Error al crear colección', 500);
  }
};

const obtenerColecciones = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const [colecciones] = await db.query(`
      SELECT c.*, COUNT(cw.wallpaper_id) as total_wallpapers
      FROM colecciones c
      LEFT JOIN colecciones_wallpapers cw ON c.id = cw.coleccion_id
      WHERE c.usuario_id = ?
      GROUP BY c.id
      ORDER BY c.fecha_creacion DESC
    `, [usuarioId]);

    return exitoRespuesta(res, 'Colecciones obtenidas', colecciones);
  } catch (error) {
    console.error('Error obteniendo colecciones:', error);
    return errorRespuesta(res, 'Error al obtener colecciones', 500);
  }
};

const obtenerColeccionPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId;

    const [colecciones] = await db.query(
      'SELECT * FROM colecciones WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );

    if (colecciones.length === 0) {
      return errorRespuesta(res, 'Colección no encontrada', 404);
    }

    const [wallpapers] = await db.query(`
      SELECT w.*, cw.orden
      FROM colecciones_wallpapers cw
      INNER JOIN wallpapers w ON cw.wallpaper_id = w.id
      WHERE cw.coleccion_id = ?
      ORDER BY cw.orden ASC
    `, [id]);

    return exitoRespuesta(res, 'Colección obtenida', {
      coleccion: colecciones[0],
      wallpapers
    });
  } catch (error) {
    console.error('Error obteniendo colección:', error);
    return errorRespuesta(res, 'Error al obtener colección', 500);
  }
};

const agregarWallpaperColeccion = async (req, res) => {
  try {
    const { coleccionId, wallpaperId, orden } = req.body;
    const usuarioId = req.usuarioId;

    const [coleccion] = await db.query(
      'SELECT id FROM colecciones WHERE id = ? AND usuario_id = ?',
      [coleccionId, usuarioId]
    );

    if (coleccion.length === 0) {
      return errorRespuesta(res, 'Colección no encontrada', 404);
    }

    await db.query(
      'INSERT INTO colecciones_wallpapers (coleccion_id, wallpaper_id, orden) VALUES (?, ?, ?)',
      [coleccionId, wallpaperId, orden || 0]
    );

    return exitoRespuesta(res, 'Wallpaper agregado a colección', null, 201);
  } catch (error) {
    console.error('Error agregando wallpaper:', error);
    return errorRespuesta(res, 'Error al agregar wallpaper', 500);
  }
};

const eliminarWallpaperColeccion = async (req, res) => {
  try {
    const { coleccionId, wallpaperId } = req.params;
    const usuarioId = req.usuarioId;

    const [coleccion] = await db.query(
      'SELECT id FROM colecciones WHERE id = ? AND usuario_id = ?',
      [coleccionId, usuarioId]
    );

    if (coleccion.length === 0) {
      return errorRespuesta(res, 'Colección no encontrada', 404);
    }

    await db.query(
      'DELETE FROM colecciones_wallpapers WHERE coleccion_id = ? AND wallpaper_id = ?',
      [coleccionId, wallpaperId]
    );

    return exitoRespuesta(res, 'Wallpaper eliminado de colección');
  } catch (error) {
    console.error('Error eliminando wallpaper:', error);
    return errorRespuesta(res, 'Error al eliminar wallpaper', 500);
  }
};

const eliminarColeccion = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId;

    const [resultado] = await db.query(
      'DELETE FROM colecciones WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );

    if (resultado.affectedRows === 0) {
      return errorRespuesta(res, 'Colección no encontrada', 404);
    }

    return exitoRespuesta(res, 'Colección eliminada');
  } catch (error) {
    console.error('Error eliminando colección:', error);
    return errorRespuesta(res, 'Error al eliminar colección', 500);
  }
};

module.exports = {
  crearColeccion,
  obtenerColecciones,
  obtenerColeccionPorId,
  agregarWallpaperColeccion,
  eliminarWallpaperColeccion,
  eliminarColeccion
};