const express = require('express');
const router = express.Router();
const notificacionControlador = require('../controladores/notificacionControlador');
const { verificarToken } = require('../middlewares/autenticacion');

router.use(verificarToken);

router.get('/', notificacionControlador.obtenerNotificaciones);
router.put('/marcar-todas-leidas', notificacionControlador.marcarTodasComoLeidas);
router.put('/:id/marcar-leida', notificacionControlador.marcarComoLeida);
router.delete('/:id', notificacionControlador.eliminarNotificacion);

module.exports = router;