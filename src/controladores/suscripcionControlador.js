const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');
const googlePlayValidator = require('../utilidades/googlePlayValidator');

const verificarCompra = async (req, res) => {
  try {
    const { purchaseToken, orderId, productId, packageName, purchaseTime, googleAccountId } = req.body;

    if (!purchaseToken || !productId) {
      return errorRespuesta(res, 'Datos de compra incompletos', 400);
    }

    if (!googleAccountId) {
      return errorRespuesta(res, 'Google Account ID requerido', 400);
    }

    const [compraExistente] = await db.query(
      'SELECT id, usuario_id, google_account_id FROM suscripciones WHERE google_play_purchase_token = ?',
      [purchaseToken]
    );

    if (compraExistente.length > 0) {
      if (compraExistente[0].google_account_id && compraExistente[0].google_account_id !== googleAccountId) {
        return errorRespuesta(res, 'Esta compra está vinculada a otra cuenta', 400);
      }
      
      if (!compraExistente[0].google_account_id) {
        await db.query(
          'UPDATE suscripciones SET google_account_id = ? WHERE id = ?',
          [googleAccountId, compraExistente[0].id]
        );
      }

      if (compraExistente[0].usuario_id) {
        await db.query(
          'UPDATE usuarios SET es_premium = TRUE, fecha_inicio_premium = NOW(), fecha_fin_premium = (SELECT fecha_fin FROM suscripciones WHERE id = ?) WHERE id = ?',
          [compraExistente[0].id, compraExistente[0].usuario_id]
        );
      }
      
      return exitoRespuesta(res, 'Compra ya procesada y vinculada', {
        suscripcionId: compraExistente[0].id
      });
    }

    const verificacion = await googlePlayValidator.verifySubscription(purchaseToken, productId);

    if (!verificacion.isValid) {
      await db.query(
        'INSERT INTO logs_compras_fallidas (purchase_token, product_id, motivo, detalles) VALUES (?, ?, ?, ?)',
        [purchaseToken, productId, 'verificacion_fallida', JSON.stringify(verificacion)]
      );
      return errorRespuesta(res, 'Compra inválida o expirada', 400);
    }

    const subscription = verificacion.subscription;
    const tipoSuscripcion = googlePlayValidator.getPlanType(productId);
    const fechaFin = new Date(subscription.expiryTime);
    const montoPagado = subscription.priceAmountMicros ? (subscription.priceAmountMicros / 1000000) : 0;

    const [resultado] = await db.query(
      `INSERT INTO suscripciones (
        usuario_id, google_account_id, tipo_suscripcion, fecha_fin, monto_pagado, metodo_pago,
        google_play_purchase_token, google_play_order_id, google_play_product_id,
        google_play_package_name, purchase_time, expiry_time, auto_renewing,
        payment_state, country_code, price_currency_code, google_raw_response,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.usuarioId || null,
        googleAccountId,
        tipoSuscripcion,
        fechaFin,
        montoPagado,
        'google_play',
        purchaseToken,
        subscription.orderId,
        productId,
        packageName,
        new Date(subscription.purchaseTime),
        fechaFin,
        subscription.autoRenewing ? 1 : 0,
        subscription.paymentState,
        subscription.countryCode,
        subscription.priceCurrencyCode,
        JSON.stringify(subscription.rawResponse),
        'activa'
      ]
    );

    const suscripcionId = resultado.insertId;

    await db.query(
      `INSERT INTO historial_pagos (
        suscripcion_id, usuario_id, monto, metodo_pago, google_play_order_id,
        google_play_purchase_token, estado_pago
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        suscripcionId,
        req.usuarioId || null,
        montoPagado,
        'google_play',
        subscription.orderId,
        purchaseToken,
        'exitoso'
      ]
    );

    if (req.usuarioId) {
      await db.query(
        'UPDATE usuarios SET es_premium = TRUE, fecha_inicio_premium = NOW(), fecha_fin_premium = ? WHERE id = ?',
        [fechaFin, req.usuarioId]
      );

      await db.query(
        'INSERT INTO logs_actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)',
        [req.usuarioId, 'activacion_suscripcion', `Suscripción ${tipoSuscripcion} activada vía Google Play`]
      );
    }

    return exitoRespuesta(res, 'Suscripción verificada y activada', {
      suscripcionId,
      tipoSuscripcion,
      fechaFin,
      autoRenewing: subscription.autoRenewing
    }, 201);
  } catch (error) {
    console.error('Error verificando compra:', error);
    return errorRespuesta(res, 'Error al verificar compra', 500);
  }
};

const verificarPorGoogleAccount = async (req, res) => {
  try {
    const { googleAccountId } = req.query;

    if (!googleAccountId) {
      return errorRespuesta(res, 'Google Account ID requerido', 400);
    }

    const [suscripciones] = await db.query(
      `SELECT * FROM suscripciones 
       WHERE google_account_id = ? 
       AND estado = 'activa' 
       AND fecha_fin > NOW() 
       ORDER BY fecha_fin DESC 
       LIMIT 1`,
      [googleAccountId]
    );

    if (suscripciones.length === 0) {
      return exitoRespuesta(res, 'Sin suscripción activa', { 
        premium: false 
      });
    }

    const suscripcion = suscripciones[0];

    return exitoRespuesta(res, 'Suscripción activa', {
      premium: true,
      tipo: suscripcion.tipo_suscripcion,
      fechaExpiracion: suscripcion.fecha_fin,
      autoRenewing: suscripcion.auto_renewing === 1
    });
  } catch (error) {
    console.error('Error verificando por Google Account:', error);
    return errorRespuesta(res, 'Error al verificar suscripción', 500);
  }
};

const sincronizarSuscripcion = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const [suscripciones] = await db.query(
      `SELECT * FROM suscripciones 
       WHERE usuario_id = ? AND estado = 'activa' 
       ORDER BY fecha_fin DESC LIMIT 1`,
      [usuarioId]
    );

    if (suscripciones.length === 0) {
      await db.query(
        'UPDATE usuarios SET es_premium = FALSE, fecha_fin_premium = NULL WHERE id = ?',
        [usuarioId]
      );
      return exitoRespuesta(res, 'No hay suscripción activa', { suscripcionActiva: false });
    }

    const suscripcion = suscripciones[0];

    if (!suscripcion.google_play_purchase_token) {
      return exitoRespuesta(res, 'Suscripción activa', { 
        suscripcionActiva: true,
        suscripcion 
      });
    }

    const estado = await googlePlayValidator.getSubscriptionStatus(
      suscripcion.google_play_purchase_token,
      suscripcion.google_play_product_id
    );

    if (estado.status === 'expired' || estado.status === 'invalid') {
      await db.query(
        'UPDATE suscripciones SET estado = ? WHERE id = ?',
        ['expirada', suscripcion.id]
      );

      await db.query(
        'UPDATE usuarios SET es_premium = FALSE, fecha_fin_premium = NULL WHERE id = ?',
        [usuarioId]
      );

      return exitoRespuesta(res, 'Suscripción expirada', { suscripcionActiva: false });
    }

    if (estado.status === 'cancelled') {
      await db.query(
        'UPDATE suscripciones SET estado = ?, auto_renewing = 0 WHERE id = ?',
        ['cancelada', suscripcion.id]
      );
      return exitoRespuesta(res, 'Suscripción cancelada', { 
        suscripcionActiva: true,
        suscripcion,
        cancelada: true
      });
    }

    const subscription = estado.subscription;
    await db.query(
      `UPDATE suscripciones SET 
       expiry_time = ?, auto_renewing = ?, payment_state = ?,
       google_raw_response = ?
       WHERE id = ?`,
      [
        new Date(subscription.expiryTime),
        subscription.autoRenewing ? 1 : 0,
        subscription.paymentState,
        JSON.stringify(subscription.rawResponse),
        suscripcion.id
      ]
    );

    await db.query(
      'UPDATE usuarios SET es_premium = TRUE, fecha_fin_premium = ? WHERE id = ?',
      [new Date(subscription.expiryTime), usuarioId]
    );

    return exitoRespuesta(res, 'Suscripción sincronizada', {
      suscripcionActiva: true,
      suscripcion: {
        ...suscripcion,
        expiry_time: new Date(subscription.expiryTime),
        auto_renewing: subscription.autoRenewing
      }
    });
  } catch (error) {
    console.error('Error sincronizando suscripción:', error);
    return errorRespuesta(res, 'Error al sincronizar suscripción', 500);
  }
};

const crearSuscripcion = async (req, res) => {
  try {
    const { tipoSuscripcion, montoPagado, metodoPago, googlePlayPurchaseToken, googlePlayOrderId } = req.body;
    const usuarioId = req.usuarioId;

    const fechaInicio = new Date();
    let fechaFin = new Date();

    if (tipoSuscripcion === 'mensual') {
      fechaFin.setMonth(fechaFin.getMonth() + 1);
    } else if (tipoSuscripcion === 'anual') {
      fechaFin.setFullYear(fechaFin.getFullYear() + 1);
    } else if (tipoSuscripcion === 'semanal') {
      fechaFin.setDate(fechaFin.getDate() + 7);
    } else {
      return errorRespuesta(res, 'Tipo de suscripción inválido', 400);
    }

    const [resultado] = await db.query(
      'INSERT INTO suscripciones (usuario_id, tipo_suscripcion, fecha_fin, monto_pagado, metodo_pago, google_play_purchase_token) VALUES (?, ?, ?, ?, ?, ?)',
      [usuarioId, tipoSuscripcion, fechaFin, montoPagado, metodoPago, googlePlayPurchaseToken]
    );

    const suscripcionId = resultado.insertId;

    await db.query(
      'INSERT INTO historial_pagos (suscripcion_id, usuario_id, monto, metodo_pago, google_play_order_id, estado_pago) VALUES (?, ?, ?, ?, ?, ?)',
      [suscripcionId, usuarioId, montoPagado, metodoPago, googlePlayOrderId, 'exitoso']
    );

    await db.query(
      'UPDATE usuarios SET es_premium = TRUE, fecha_inicio_premium = ?, fecha_fin_premium = ? WHERE id = ?',
      [fechaInicio, fechaFin, usuarioId]
    );

    await db.query(
      'INSERT INTO logs_actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)',
      [usuarioId, 'activacion_suscripcion', `Suscripción ${tipoSuscripcion} activada`]
    );

    return exitoRespuesta(res, 'Suscripción creada exitosamente', {
      suscripcionId,
      tipoSuscripcion,
      fechaFin
    }, 201);
  } catch (error) {
    console.error('Error creando suscripción:', error);
    return errorRespuesta(res, 'Error al crear suscripción', 500);
  }
};

const obtenerSuscripcionActual = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const [suscripciones] = await db.query(
      'SELECT * FROM suscripciones WHERE usuario_id = ? AND estado = "activa" ORDER BY fecha_fin DESC LIMIT 1',
      [usuarioId]
    );

    if (suscripciones.length === 0) {
      await db.query(
        'UPDATE usuarios SET es_premium = FALSE, fecha_fin_premium = NULL WHERE id = ?',
        [usuarioId]
      );
      return exitoRespuesta(res, 'No hay suscripción activa', { suscripcionActiva: false });
    }

    const suscripcion = suscripciones[0];
    const ahora = new Date();
    const fechaFin = new Date(suscripcion.fecha_fin);

    if (fechaFin < ahora) {
      await db.query(
        'UPDATE suscripciones SET estado = "expirada" WHERE id = ?',
        [suscripcion.id]
      );

      await db.query(
        'UPDATE usuarios SET es_premium = FALSE, fecha_fin_premium = NULL WHERE id = ?',
        [usuarioId]
      );

      return exitoRespuesta(res, 'Suscripción expirada', { suscripcionActiva: false });
    }

    return exitoRespuesta(res, 'Suscripción activa', {
      suscripcionActiva: true,
      suscripcion
    });
  } catch (error) {
    console.error('Error obteniendo suscripción:', error);
    return errorRespuesta(res, 'Error al obtener suscripción', 500);
  }
};

const cancelarSuscripcion = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const [resultado] = await db.query(
      'UPDATE suscripciones SET estado = "cancelada" WHERE usuario_id = ? AND estado = "activa"',
      [usuarioId]
    );

    if (resultado.affectedRows === 0) {
      return errorRespuesta(res, 'No hay suscripción activa para cancelar', 404);
    }

    await db.query(
      'INSERT INTO logs_actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)',
      [usuarioId, 'cancelacion_suscripcion', 'Suscripción cancelada por el usuario']
    );

    return exitoRespuesta(res, 'Suscripción cancelada exitosamente');
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    return errorRespuesta(res, 'Error al cancelar suscripción', 500);
  }
};

const obtenerHistorialPagos = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const [pagos] = await db.query(
      'SELECT * FROM historial_pagos WHERE usuario_id = ? ORDER BY fecha_pago DESC',
      [usuarioId]
    );

    return exitoRespuesta(res, 'Historial de pagos obtenido', pagos);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return errorRespuesta(res, 'Error al obtener historial de pagos', 500);
  }
};

module.exports = {
  verificarCompra,
  sincronizarSuscripcion,
  crearSuscripcion,
  obtenerSuscripcionActual,
  cancelarSuscripcion,
  obtenerHistorialPagos,
  verificarPorGoogleAccount
};