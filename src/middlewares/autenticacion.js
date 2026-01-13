const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/servidor');
const { errorRespuesta } = require('../utilidades/respuestas');

const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return errorRespuesta(res, 'Token no proporcionado', 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuarioId = decoded.id;
    req.usuarioEmail = decoded.email;
    next();
  } catch (error) {
    return errorRespuesta(res, 'Token inválido o expirado', 401);
  }
};

const verificarSuscripcionActiva = async (req, res, next) => {
  try {
    const db = require('../config/baseDatos');
    const [suscripciones] = await db.query(
      'SELECT * FROM suscripciones WHERE usuario_id = ? AND estado = "activa" AND fecha_fin > NOW()',
      [req.usuarioId]
    );

    if (suscripciones.length === 0) {
      return errorRespuesta(res, 'Suscripción requerida o expirada', 403);
    }

    req.suscripcion = suscripciones[0];
    next();
  } catch (error) {
    return errorRespuesta(res, 'Error verificando suscripción', 500);
  }
};

module.exports = {
  verificarToken,
  verificarSuscripcionActiva
};