const db = require('../config/baseDatos');

class Favorito {
  static async crear(usuarioId, wallpaperId) {
    try {
      const [resultado] = await db.query(
        'INSERT INTO favoritos (usuario_id, wallpaper_id) VALUES (?, ?)',
        [usuarioId, wallpaperId]
      );
      return resultado.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  }

  static async eliminar(usuarioId, wallpaperId) {
    const [resultado] = await db.query(
      'DELETE FROM favoritos WHERE usuario_id = ? AND wallpaper_id = ?',
      [usuarioId, wallpaperId]
    );
    return resultado.affectedRows > 0;
  }

  static async existe(usuarioId, wallpaperId) {
    const [favoritos] = await db.query(
      'SELECT id FROM favoritos WHERE usuario_id = ? AND wallpaper_id = ?',
      [usuarioId, wallpaperId]
    );
    return favoritos.length > 0;
  }

  static async listarPorUsuario(usuarioId, limite = 20, offset = 0) {
    const [favoritos] = await db.query(`
      SELECT f.*, w.*, c.nombre as nombre_categoria, e.total_vistas, e.total_descargas
      FROM favoritos f
      INNER JOIN wallpapers w ON f.wallpaper_id = w.id
      LEFT JOIN categorias c ON w.categoria_id = c.id
      LEFT JOIN estadisticas_wallpapers e ON w.id = e.wallpaper_id
      WHERE f.usuario_id = ? AND w.activo = TRUE
      ORDER BY f.fecha_agregado DESC
      LIMIT ? OFFSET ?
    `, [usuarioId, parseInt(limite), parseInt(offset)]);
    return favoritos;
  }

  static async contarPorUsuario(usuarioId) {
    const [resultado] = await db.query(
      'SELECT COUNT(*) as total FROM favoritos WHERE usuario_id = ?',
      [usuarioId]
    );
    return resultado[0].total;
  }

  static async eliminarTodosPorUsuario(usuarioId) {
    const [resultado] = await db.query(
      'DELETE FROM favoritos WHERE usuario_id = ?',
      [usuarioId]
    );
    return resultado.affectedRows;
  }
}

module.exports = Favorito;