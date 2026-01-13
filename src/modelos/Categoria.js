const db = require('../config/baseDatos');

class Categoria {
  static async crear(datos) {
    const { nombre, descripcion, iconoUrl, orden } = datos;
    const [resultado] = await db.query(
      'INSERT INTO categorias (nombre, descripcion, icono_url, orden, activa) VALUES (?, ?, ?, ?, ?)',
      [nombre, descripcion || null, iconoUrl || null, orden || 0, true]
    );
    return resultado.insertId;
  }

  static async buscarPorId(id) {
    const [categorias] = await db.query(
      'SELECT * FROM categorias WHERE id = ? AND activa = TRUE',
      [id]
    );
    return categorias[0] || null;
  }

  static async buscarPorNombre(nombre) {
    const [categorias] = await db.query(
      'SELECT * FROM categorias WHERE nombre = ? AND activa = TRUE',
      [nombre]
    );
    return categorias[0] || null;
  }

  static async listar() {
    const [categorias] = await db.query(
      'SELECT * FROM categorias WHERE activa = TRUE ORDER BY orden ASC, nombre ASC'
    );
    return categorias;
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
    if (datos.iconoUrl !== undefined) {
      campos.push('icono_url = ?');
      valores.push(datos.iconoUrl);
    }
    if (datos.orden !== undefined) {
      campos.push('orden = ?');
      valores.push(datos.orden);
    }
    if (datos.activa !== undefined) {
      campos.push('activa = ?');
      valores.push(datos.activa);
    }

    if (campos.length === 0) return false;

    valores.push(id);
    const [resultado] = await db.query(
      `UPDATE categorias SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );
    return resultado.affectedRows > 0;
  }

  static async desactivar(id) {
    const [resultado] = await db.query(
      'UPDATE categorias SET activa = FALSE WHERE id = ?',
      [id]
    );
    return resultado.affectedRows > 0;
  }

  static async contarWallpapers(id) {
    const [resultado] = await db.query(
      'SELECT COUNT(*) as total FROM wallpapers WHERE categoria_id = ? AND activo = TRUE',
      [id]
    );
    return resultado[0].total;
  }

  static async existe(nombre) {
    const [categorias] = await db.query(
      'SELECT id FROM categorias WHERE nombre = ?',
      [nombre]
    );
    return categorias.length > 0;
  }
}

module.exports = Categoria;