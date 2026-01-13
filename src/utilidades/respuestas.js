const exitoRespuesta = (res, mensaje, datos = null, statusCode = 200) => {
  const respuesta = {
    exito: true,
    mensaje
  };

  if (datos !== null) {
    respuesta.datos = datos;
  }

  return res.status(statusCode).json(respuesta);
};

const errorRespuesta = (res, mensaje, statusCode = 400, errores = null) => {
  const respuesta = {
    exito: false,
    mensaje
  };

  if (errores !== null) {
    respuesta.errores = errores;
  }

  return res.status(statusCode).json(respuesta);
};

module.exports = {
  exitoRespuesta,
  errorRespuesta
};