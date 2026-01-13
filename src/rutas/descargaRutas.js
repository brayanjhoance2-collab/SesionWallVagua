const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const descargaControlador = require('../controladores/descargaControlador');
const { verificarToken } = require('../middlewares/autenticacion');
const { validarResultado } = require('../middlewares/validacion');

router.use(verificarToken);

router.get('/historial', descargaControlador.obtenerHistorialDescargas);

router.post('/',
  [
    body('wallpaperId').isInt().withMessage('ID de wallpaper inválido'),
    body('calidadDescarga').optional().isIn(['baja', 'media', 'alta', 'original']).withMessage('Calidad inválida'),
    validarResultado
  ],
  descargaControlador.registrarDescarga
);

module.exports = router;