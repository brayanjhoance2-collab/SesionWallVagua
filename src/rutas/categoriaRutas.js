const express = require('express');
const router = express.Router();
const categoriaControlador = require('../controladores/categoriaControlador');

router.get('/', categoriaControlador.obtenerCategorias);
router.get('/:id', categoriaControlador.obtenerCategoriaPorId);

module.exports = router;