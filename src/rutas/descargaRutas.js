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
    body('wallpaperId').notEmpty().withMessage('ID de wallpaper requerido'),
    body('titulo').optional().isString(),
    body('urlImagen').optional().isString(),
    body('urlThumbnail').optional().isString(),
    body('categoriaNombre').optional().isString(),
    body('resolucion').optional().isString(),
    body('mimeType').optional().isString(),
    body('calidadDescarga').optional().isIn(['baja', 'media', 'alta', 'original']).withMessage('Calidad inválida'),
    body('dispositivo').optional().isString(),
    validarResultado
  ],
  descargaControlador.registrarDescarga
);

module.exports = router;