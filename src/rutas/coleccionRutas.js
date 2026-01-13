const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const coleccionControlador = require('../controladores/coleccionControlador');
const { verificarToken } = require('../middlewares/autenticacion');
const { validarResultado } = require('../middlewares/validacion');

router.use(verificarToken);

router.get('/', coleccionControlador.obtenerColecciones);
router.get('/:id', coleccionControlador.obtenerColeccionPorId);

router.post('/',
  [
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    validarResultado
  ],
  coleccionControlador.crearColeccion
);

router.post('/wallpaper',
  [
    body('coleccionId').isInt().withMessage('ID de colección inválido'),
    body('wallpaperId').isInt().withMessage('ID de wallpaper inválido'),
    validarResultado
  ],
  coleccionControlador.agregarWallpaperColeccion
);

router.delete('/:id', coleccionControlador.eliminarColeccion);
router.delete('/:coleccionId/wallpaper/:wallpaperId', coleccionControlador.eliminarWallpaperColeccion);

module.exports = router;