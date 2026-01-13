const db = require('../config/baseDatos');

class Suscripcion {
  static async crear(datos) {
    const { usuarioId, tipoSuscripcion, fechaFin, montoPagado, metodoPago, googlePlayPurchaseToken } = datos;
    const [resultado] = await db.query(
      'INSERT INTO suscripciones (usuario_id, tipo_suscripcion, fecha_fin, monto_pagado, metodo_pago, google_play_purchase_token, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [usuarioId, tipoSuscripcion, fechaFin, montoPagado, metodoPago, googlePlayPurchaseToken || null, 'activa']
    );
    return resultado.insertId;
  }

  static async buscarPorId(id) {
    const [suscripciones] = await db.query(
      'SELECT * FROM suscripciones WHERE id = ?',
      [id]
    );
    return suscripciones[0] || null;
  }

  static async buscarActivaPorUsuario(usuarioId) {
    const [suscripciones] = await db.query(
      'SELECT * FROM suscripciones WHERE usuario_id = ? AND estado = "activa" AND fecha_fin > NOW() ORDER BY fecha_fin DESC LIMIT 1',
      [usuarioId]
    );
    return suscripciones[0] || null;
  }

  static async listarPorUsuario(usuarioId) {
    const [suscripciones] = await db.query(
      'SELECT * FROM suscripciones WHERE usuario_id = ? ORDER BY fecha_inicio DESC',
      [usuarioId]
    );
    return suscripciones;
  }

  static async actualizar(id, datos) {
    const campos = [];
    const valores = [];

    if (datos.estado !== undefined) {
      campos.push('estado = ?');
      valores.push(datos.estado);
    }
    if (datos.fechaFin !== undefined) {
      campos.push('fecha_fin = ?');
      valores.push(datos.fechaFin);
    }
    if (datos.fechaRenovacion !== undefined) {
      campos.push('fecha_renovacion = ?');
      valores.push(datos.fechaRenovacion);
    }

    if (campos.length === 0) return false;

    valores.push(id);
    const [resultado] = await db.query(
      `UPDATE suscripciones SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );
    return resultado.affectedRows > 0;
  }

  static async cancelar(usuarioId) {
    const [resultado] = await db.query(
      'UPDATE suscripciones SET estado = "cancelada" WHERE usuario_id = ? AND estado = "activa"',
      [usuarioId]
    );
    return resultado.affectedRows > 0;
  }

  static async verificarVigencia(usuarioId) {
    const suscripcion = await this.buscarActivaPorUsuario(usuarioId);
    if (!suscripcion) return false;

    const ahora = new Date();
    const fechaFin = new Date(suscripcion.fecha_fin);

    if (fechaFin < ahora) {
      await this.actualizar(suscripcion.id, { estado: 'expirada' });
      return false;
    }

    return true;
  }

  static async marcarComoExpiradas() {
    const [resultado] = await db.query(
      'UPDATE suscripciones SET estado = "expirada" WHERE estado = "activa" AND fecha_fin < NOW()'
    );
    return resultado.affectedRows;
  }
}

module.exports = Suscripcion;