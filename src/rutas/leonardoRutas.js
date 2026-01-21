const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const leonardoControlador = require('../controladores/leonardoControlador');
const { verificarToken } = require('../middlewares/autenticacion');
const { validarResultado } = require('../middlewares/validacion');

router.use(verificarToken);

router.post('/generar',
  [
    body('prompt').notEmpty().withMessage('El prompt es requerido'),
    body('width').optional().isInt({ min: 512, max: 2048 }).withMessage('Ancho inválido'),
    body('height').optional().isInt({ min: 512, max: 2048 }).withMessage('Alto inválido'),
    body('numImages').optional().isInt({ min: 1, max: 4 }).withMessage('Número de imágenes inválido'),
    validarResultado
  ],
  leonardoControlador.generarWallpaper
);

router.get('/verificar/:generacionId', leonardoControlador.verificarEstado);

router.get('/historial', leonardoControlador.obtenerHistorial);

module.exports = router;