const express = require('express');
const router = express.Router();
const puntosControlador = require('../controladores/puntosControlador');
const { verificarToken } = require('../middlewares/autenticacion');

router.use(verificarToken);

router.get('/', puntosControlador.obtenerPuntos);
router.get('/historial', puntosControlador.obtenerHistorialPuntos);
router.get('/eventos', puntosControlador.obtenerEventosPuntos);

module.exports = router;