const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const favoritoControlador = require('../controladores/favoritoControlador');
const { verificarToken } = require('../middlewares/autenticacion');
const { validarResultado } = require('../middlewares/validacion');

router.use(verificarToken);

router.get('/', favoritoControlador.obtenerFavoritos);
router.get('/verificar/:wallpaperId', favoritoControlador.verificarFavorito);

router.post('/',
  [
    body('wallpaperId').notEmpty().withMessage('ID de wallpaper requerido'),
    body('titulo').optional().isString(),
    body('urlImagen').optional().isString(),
    body('urlThumbnail').optional().isString(),
    body('categoriaNombre').optional().isString(),
    body('resolucion').optional().isString(),
    body('mimeType').optional().isString(),
    body('tipoWallpaper').optional().isString(),
    body('esPremium').optional().isBoolean(),
    validarResultado
  ],
  favoritoControlador.agregarFavorito
);

router.delete('/:wallpaperId', favoritoControlador.eliminarFavorito);

module.exports = router;