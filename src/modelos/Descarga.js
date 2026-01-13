const db = require('../config/baseDatos');

class Descarga {
  static async crear(datos) {
    const { usuarioId, wallpaperId, calidadDescarga, dispositivo } = datos;
    const [resultado] = await db.query(
      'INSERT INTO descargas (usuario_id, wallpaper_id, calidad_descarga, dispositivo) VALUES (?, ?, ?, ?)',
      [usuarioId, wallpaperId, calidadDescarga || 'alta', dispositivo || null]
    );
    return resultado.insertId;
  }

  static async listarPorUsuario(usuarioId, limite = 20, offset = 0) {
    const [descargas] = await db.query(`
      SELECT d.*, w.titulo, w.url_imagen, w.url_thumbnail, c.nombre as nombre_categoria
      FROM descargas d
      INNER JOIN wallpapers w ON d.wallpaper_id = w.id
      LEFT JOIN categorias c ON w.categoria_id = c.id
      WHERE d.usuario_id = ?
      ORDER BY d.fecha_descarga DESC
      LIMIT ? OFFSET ?
    `, [usuarioId, parseInt(limite), parseInt(offset)]);
    return descargas;
  }

  static async contarPorUsuario(usuarioId) {
    const [resultado] = await db.query(
      'SELECT COUNT(*) as total FROM descargas WHERE usuario_id = ?',
      [usuarioId]
    );
    return resultado[0].total;
  }

  static async contarPorWallpaper(wallpaperId) {
    const [resultado] = await db.query(
      'SELECT COUNT(*) as total FROM descargas WHERE wallpaper_id = ?',
      [wallpaperId]
    );
    return resultado[0].total;
  }

  static async obtenerMasDescargados(limite = 10) {
    const [wallpapers] = await db.query(`
      SELECT w.*, c.nombre as nombre_categoria, COUNT(d.id) as total_descargas
      FROM wallpapers w
      INNER JOIN descargas d ON w.id = d.wallpaper_id
      LEFT JOIN categorias c ON w.categoria_id = c.id
      WHERE w.activo = TRUE
      GROUP BY w.id
      ORDER BY total_descargas DESC
      LIMIT ?
    `, [parseInt(limite)]);
    return wallpapers;
  }

  static async eliminarPorUsuario(usuarioId) {
    const [resultado] = await db.query(
      'DELETE FROM descargas WHERE usuario_id = ?',
      [usuarioId]
    );
    return resultado.affectedRows;
  }
}

module.exports = Descarga;