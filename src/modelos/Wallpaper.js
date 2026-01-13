const db = require('../config/baseDatos');

class Wallpaper {
  static async crear(datos) {
    const { titulo, urlImagen, urlThumbnail, categoriaId, etiquetas, resolucion, tamañoArchivo, premium } = datos;
    const [resultado] = await db.query(
      'INSERT INTO wallpapers (titulo, url_imagen, url_thumbnail, categoria_id, etiquetas, resolucion, tamaño_archivo, premium) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [titulo, urlImagen, urlThumbnail || null, categoriaId, etiquetas || null, resolucion || null, tamañoArchivo || null, premium || false]
    );
    return resultado.insertId;
  }

  static async buscarPorId(id) {
    const [wallpapers] = await db.query(`
      SELECT w.*, c.nombre as nombre_categoria, e.total_vistas, e.total_descargas, e.total_favoritos
      FROM wallpapers w
      LEFT JOIN categorias c ON w.categoria_id = c.id
      LEFT JOIN estadisticas_wallpapers e ON w.id = e.wallpaper_id
      WHERE w.id = ? AND w.activo = TRUE
    `, [id]);
    return wallpapers[0] || null;
  }

  static async listar(filtros = {}) {
    const { limite = 20, offset = 0, categoriaId, busqueda, premium } = filtros;
    
    let query = `
      SELECT w.*, c.nombre as nombre_categoria, e.total_vistas, e.total_descargas, e.total_favoritos
      FROM wallpapers w
      LEFT JOIN categorias c ON w.categoria_id = c.id
      LEFT JOIN estadisticas_wallpapers e ON w.id = e.wallpaper_id
      WHERE w.activo = TRUE
    `;
    
    const params = [];

    if (categoriaId) {
      query += ' AND w.categoria_id = ?';
      params.push(categoriaId);
    }

    if (busqueda) {
      query += ' AND (w.titulo LIKE ? OR w.etiquetas LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    if (premium !== undefined) {
      query += ' AND w.premium = ?';
      params.push(premium);
    }

    query += ' ORDER BY w.fecha_subida DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const [wallpapers] = await db.query(query, params);
    return wallpapers;
  }

  static async contar(filtros = {}) {
    const { categoriaId, busqueda, premium } = filtros;
    
    let query = 'SELECT COUNT(*) as total FROM wallpapers WHERE activo = TRUE';
    const params = [];

    if (categoriaId) {
      query += ' AND categoria_id = ?';
      params.push(categoriaId);
    }

    if (busqueda) {
      query += ' AND (titulo LIKE ? OR etiquetas LIKE ?)';
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    if (premium !== undefined) {
      query += ' AND premium = ?';
      params.push(premium);
    }

    const [resultado] = await db.query(query, params);
    return resultado[0].total;
  }

  static async actualizar(id, datos) {
    const campos = [];
    const valores = [];

    if (datos.titulo !== undefined) {
      campos.push('titulo = ?');
      valores.push(datos.titulo);
    }
    if (datos.urlImagen !== undefined) {
      campos.push('url_imagen = ?');
      valores.push(datos.urlImagen);
    }
    if (datos.categoriaId !== undefined) {
      campos.push('categoria_id = ?');
      valores.push(datos.categoriaId);
    }
    if (datos.etiquetas !== undefined) {
      campos.push('etiquetas = ?');
      valores.push(datos.etiquetas);
    }
    if (datos.premium !== undefined) {
      campos.push('premium = ?');
      valores.push(datos.premium);
    }
    if (datos.activo !== undefined) {
      campos.push('activo = ?');
      valores.push(datos.activo);
    }

    if (campos.length === 0) return false;

    valores.push(id);
    const [resultado] = await db.query(
      `UPDATE wallpapers SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );
    return resultado.affectedRows > 0;
  }

  static async eliminar(id) {
    const [resultado] = await db.query(
      'UPDATE wallpapers SET activo = FALSE WHERE id = ?',
      [id]
    );
    return resultado.affectedRows > 0;
  }

  static async obtenerTendencias(limite = 10) {
    const [wallpapers] = await db.query(`
      SELECT w.*, c.nombre as nombre_categoria, e.total_vistas, e.total_descargas, e.total_favoritos
      FROM wallpapers w
      LEFT JOIN categorias c ON w.categoria_id = c.id
      LEFT JOIN estadisticas_wallpapers e ON w.id = e.wallpaper_id
      WHERE w.activo = TRUE
      ORDER BY (COALESCE(e.total_vistas, 0) * 0.3 + COALESCE(e.total_descargas, 0) * 0.5 + COALESCE(e.total_favoritos, 0) * 0.2) DESC
      LIMIT ?
    `, [parseInt(limite)]);
    return wallpapers;
  }
}

module.exports = Wallpaper;