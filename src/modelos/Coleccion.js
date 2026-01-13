const db = require('../config/baseDatos');

class Coleccion {
  static async crear(datos) {
    const { usuarioId, nombre, descripcion, publica } = datos;
    const [resultado] = await db.query(
      'INSERT INTO colecciones (usuario_id, nombre, descripcion, publica) VALUES (?, ?, ?, ?)',
      [usuarioId, nombre, descripcion || null, publica || false]
    );
    return resultado.insertId;
  }

  static async buscarPorId(id) {
    const [colecciones] = await db.query(
      'SELECT * FROM colecciones WHERE id = ?',
      [id]
    );
    return colecciones[0] || null;
  }

  static async listarPorUsuario(usuarioId) {
    const [colecciones] = await db.query(`
      SELECT c.*, COUNT(cw.wallpaper_id) as total_wallpapers
      FROM colecciones c
      LEFT JOIN colecciones_wallpapers cw ON c.id = cw.coleccion_id
      WHERE c.usuario_id = ?
      GROUP BY c.id
      ORDER BY c.fecha_creacion DESC
    `, [usuarioId]);
    return colecciones;
  }

  static async actualizar(id, datos) {
    const campos = [];
    const valores = [];

    if (datos.nombre !== undefined) {
      campos.push('nombre = ?');
      valores.push(datos.nombre);
    }
    if (datos.descripcion !== undefined) {
      campos.push('descripcion = ?');
      valores.push(datos.descripcion);
    }
    if (datos.publica !== undefined) {
      campos.push('publica = ?');
      valores.push(datos.publica);
    }

    if (campos.length === 0) return false;

    valores.push(id);
    const [resultado] = await db.query(
      `UPDATE colecciones SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );
    return resultado.affectedRows > 0;
  }

  static async eliminar(id) {
    const [resultado] = await db.query(
      'DELETE FROM colecciones WHERE id = ?',
      [id]
    );
    return resultado.affectedRows > 0;
  }

  static async agregarWallpaper(coleccionId, wallpaperId, orden = 0) {
    try {
      const [resultado] = await db.query(
        'INSERT INTO colecciones_wallpapers (coleccion_id, wallpaper_id, orden) VALUES (?, ?, ?)',
        [coleccionId, wallpaperId, orden]
      );
      return resultado.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  }

  static async eliminarWallpaper(coleccionId, wallpaperId) {
    const [resultado] = await db.query(
      'DELETE FROM colecciones_wallpapers WHERE coleccion_id = ? AND wallpaper_id = ?',
      [coleccionId, wallpaperId]
    );
    return resultado.affectedRows > 0;
  }

  static async obtenerWallpapers(coleccionId) {
    const [wallpapers] = await db.query(`
      SELECT w.*, cw.orden, c.nombre as nombre_categoria
      FROM colecciones_wallpapers cw
      INNER JOIN wallpapers w ON cw.wallpaper_id = w.id
      LEFT JOIN categorias c ON w.categoria_id = c.id
      WHERE cw.coleccion_id = ? AND w.activo = TRUE
      ORDER BY cw.orden ASC
    `, [coleccionId]);
    return wallpapers;
  }

  static async contarWallpapers(coleccionId) {
    const [resultado] = await db.query(
      'SELECT COUNT(*) as total FROM colecciones_wallpapers WHERE coleccion_id = ?',
      [coleccionId]
    );
    return resultado[0].total;
  }

  static async verificarPropietario(coleccionId, usuarioId) {
    const [colecciones] = await db.query(
      'SELECT id FROM colecciones WHERE id = ? AND usuario_id = ?',
      [coleccionId, usuarioId]
    );
    return colecciones.length > 0;
  }
}

module.exports = Coleccion;