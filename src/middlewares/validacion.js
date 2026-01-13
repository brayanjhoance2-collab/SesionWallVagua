const { validationResult } = require('express-validator');
const { errorRespuesta } = require('../utilidades/respuestas');

const validarResultado = (req, res, next) => {
  const errores = validationResult(req);
  
  if (!errores.isEmpty()) {
    return errorRespuesta(res, 'Errores de validación', 400, errores.array());
  }
  
  next();
};

module.exports = { validarResultado };