const db = require('../config/baseDatos');

class Usuario {
  static async crear(datos) {
    const { nombre, email, passwordHash, googlePlayId } = datos;
    const [resultado] = await db.query(
      'INSERT INTO usuarios (nombre, email, password_hash, google_play_id, activo) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, passwordHash, googlePlayId || null, false]
    );
    return resultado.insertId;
  }

  static async buscarPorEmail(email) {
    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    return usuarios[0] || null;
  }

  static async buscarPorId(id) {
    const [usuarios] = await db.query(
      'SELECT id, nombre, email, fecha_registro, activo, google_play_id FROM usuarios WHERE id = ?',
      [id]
    );
    return usuarios[0] || null;
  }

  static async actualizar(id, datos) {
    const campos = [];
    const valores = [];

    if (datos.nombre !== undefined) {
      campos.push('nombre = ?');
      valores.push(datos.nombre);
    }
    if (datos.email !== undefined) {
      campos.push('email = ?');
      valores.push(datos.email);
    }
    if (datos.passwordHash !== undefined) {
      campos.push('password_hash = ?');
      valores.push(datos.passwordHash);
    }
    if (datos.activo !== undefined) {
      campos.push('activo = ?');
      valores.push(datos.activo);
    }

    if (campos.length === 0) return false;

    valores.push(id);
    const [resultado] = await db.query(
      `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );
    return resultado.affectedRows > 0;
  }

  static async activar(id) {
    const [resultado] = await db.query(
      'UPDATE usuarios SET activo = TRUE WHERE id = ?',
      [id]
    );
    return resultado.affectedRows > 0;
  }

  static async eliminar(id) {
    const [resultado] = await db.query(
      'DELETE FROM usuarios WHERE id = ?',
      [id]
    );
    return resultado.affectedRows > 0;
  }

  static async existeEmail(email) {
    const [usuarios] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );
    return usuarios.length > 0;
  }
}

module.exports = Usuario;