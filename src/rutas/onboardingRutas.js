const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const onboardingControlador = require('../controladores/onboardingControlador');
const { validarResultado } = require('../middlewares/validacion');

router.post('/save',
  [
    body('deviceId').notEmpty().withMessage('Device ID requerido'),
    validarResultado
  ],
  onboardingControlador.guardarDatosOnboarding
);

router.get('/estadisticas', onboardingControlador.obtenerEstadisticas);

module.exports = router;