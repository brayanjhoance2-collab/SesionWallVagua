const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const suscripcionControlador = require('../controladores/suscripcionControlador');
const { verificarToken } = require('../middlewares/autenticacion');
const { validarResultado } = require('../middlewares/validacion');

router.post('/verificar-compra',
  [
    body('purchaseToken').notEmpty().withMessage('Token de compra requerido'),
    body('productId').notEmpty().withMessage('ID de producto requerido'),
    body('packageName').notEmpty().withMessage('Nombre de paquete requerido'),
    body('googleAccountId').notEmpty().withMessage('Google Account ID requerido'),
    validarResultado
  ],
  suscripcionControlador.verificarCompra
);

router.get('/verificar-por-google-account', suscripcionControlador.verificarPorGoogleAccount);

router.use(verificarToken);

router.get('/actual', suscripcionControlador.obtenerSuscripcionActual);
router.get('/sincronizar', suscripcionControlador.sincronizarSuscripcion);
router.get('/historial-pagos', suscripcionControlador.obtenerHistorialPagos);

router.post('/',
  [
    body('tipoSuscripcion').isIn(['semanal', 'mensual', 'anual']).withMessage('Tipo de suscripción inválido'),
    body('montoPagado').isFloat({ min: 0 }).withMessage('Monto inválido'),
    body('metodoPago').notEmpty().withMessage('Método de pago requerido'),
    validarResultado
  ],
  suscripcionControlador.crearSuscripcion
);

router.put('/cancelar', suscripcionControlador.cancelarSuscripcion);

module.exports = router;