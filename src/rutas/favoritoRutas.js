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
    body('wallpaperId').isInt().withMessage('ID de wallpaper inválido'),
    validarResultado
  ],
  favoritoControlador.agregarFavorito
);

router.delete('/:wallpaperId', favoritoControlador.eliminarFavorito);

module.exports = router;