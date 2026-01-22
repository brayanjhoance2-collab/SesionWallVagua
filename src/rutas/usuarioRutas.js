const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const usuarioControlador = require('../controladores/usuarioControlador');
const { verificarToken } = require('../middlewares/autenticacion');
const { validarResultado } = require('../middlewares/validacion');

router.use(verificarToken);

router.get('/perfil', usuarioControlador.obtenerPerfil);

router.put('/perfil',
  [
    body('apodo').optional().isLength({ min: 2, max: 100 }).withMessage('Apodo debe tener entre 2 y 100 caracteres'),
    body('nombre_completo').optional().isLength({ min: 2, max: 100 }).withMessage('Nombre completo debe tener entre 2 y 100 caracteres'),
    validarResultado
  ],
  usuarioControlador.actualizarPerfil
);

router.put('/preferencias',
  [
    body('edad').optional().isInt({ min: 1, max: 120 }).withMessage('Edad inválida'),
    validarResultado
  ],
  usuarioControlador.actualizarPreferencias
);

router.put('/gustos',
  [
    body('categorias').isArray().withMessage('Las categorías deben ser un array'),
    validarResultado
  ],
  usuarioControlador.actualizarGustos
);

router.put('/configuracion', usuarioControlador.actualizarConfiguracion);

module.exports = router;