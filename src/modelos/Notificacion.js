const db = require('../config/baseDatos');

class Notificacion {
  static async crear(datos) {
    const { usuarioId, tipo, titulo, mensaje, datosAdicionales } = datos;
    const [resultado] = await db.query(
      'INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, datos_adicionales) VALUES (?, ?, ?, ?, ?)',
      [usuarioId, tipo, titulo, mensaje, datosAdicionales ? JSON.stringify(datosAdicionales) : null]
    );
    return resultado.insertId;
  }

  static async buscarPorId(id) {
    const [notificaciones] = await db.query(
      'SELECT * FROM notificaciones WHERE id = ?',
      [id]
    );
    return notificaciones[0] || null;
  }

  static async listarPorUsuario(usuarioId, filtros = {}) {
    const { limite = 20, offset = 0, soloNoLeidas = false } = filtros;
    
    let query = 'SELECT * FROM notificaciones WHERE usuario_id = ?';
    const params = [usuarioId];

    if (soloNoLeidas) {
      query += ' AND leida = FALSE';
    }

    query += ' ORDER BY fecha_envio DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limite), parseInt(offset));

    const [notificaciones] = await db.query(query, params);
    return notificaciones;
  }

  static async contarPorUsuario(usuarioId, soloNoLeidas = false) {
    let query = 'SELECT COUNT(*) as total FROM notificaciones WHERE usuario_id = ?';
    const params = [usuarioId];

    if (soloNoLeidas) {
      query += ' AND leida = FALSE';
    }

    const [resultado] = await db.query(query, params);
    return resultado[0].total;
  }

  static async marcarComoLeida(id) {
    const [resultado] = await db.query(
      'UPDATE notificaciones SET leida = TRUE, fecha_lectura = NOW() WHERE id = ?',
      [id]
    );
    return resultado.affectedRows > 0;
  }

  static async marcarTodasComoLeidas(usuarioId) {
    const [resultado] = await db.query(
      'UPDATE notificaciones SET leida = TRUE, fecha_lectura = NOW() WHERE usuario_id = ? AND leida = FALSE',
      [usuarioId]
    );
    return resultado.affectedRows;
  }

  static async eliminar(id) {
    const [resultado] = await db.query(
      'DELETE FROM notificaciones WHERE id = ?',
      [id]
    );
    return resultado.affectedRows > 0;
  }

  static async eliminarTodasPorUsuario(usuarioId) {
    const [resultado] = await db.query(
      'DELETE FROM notificaciones WHERE usuario_id = ?',
      [usuarioId]
    );
    return resultado.affectedRows;
  }

  static async enviarNotificacionMasiva(tipo, titulo, mensaje, datosAdicionales = null) {
    const [usuarios] = await db.query(
      'SELECT id FROM usuarios WHERE activo = TRUE'
    );

    const notificaciones = usuarios.map(usuario => [
      usuario.id,
      tipo,
      titulo,
      mensaje,
      datosAdicionales ? JSON.stringify(datosAdicionales) : null
    ]);

    if (notificaciones.length === 0) return 0;

    const [resultado] = await db.query(
      'INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, datos_adicionales) VALUES ?',
      [notificaciones]
    );
    return resultado.affectedRows;
  }
}

module.exports = Notificacion;