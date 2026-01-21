const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authControlador = require('../controladores/authControlador');
const { validarResultado } = require('../middlewares/validacion');
const { verificarToken } = require('../middlewares/autenticacion');

router.post('/registro',
  [
    body('username').notEmpty().withMessage('El username es requerido'),
    body('apodo').notEmpty().withMessage('El apodo es requerido'),
    body('nombreCompleto').notEmpty().withMessage('El nombre completo es requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener mínimo 6 caracteres'),
    validarResultado
  ],
  authControlador.registro
);

router.post('/registro-google',
  [
    body('googleToken').notEmpty().withMessage('Token de Google requerido'),
    validarResultado
  ],
  authControlador.registroGoogle
);

router.post('/verificar-codigo',
  [
    body('usuarioId').isInt().withMessage('ID de usuario inválido'),
    body('codigo').isLength({ min: 6, max: 6 }).withMessage('Código inválido'),
    validarResultado
  ],
  authControlador.verificarCodigo
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
    validarResultado
  ],
  authControlador.login
);

router.post('/solicitar-recuperacion',
  [
    body('email').isEmail().withMessage('Email inválido'),
    validarResultado
  ],
  authControlador.solicitarRecuperacionPassword
);

router.post('/verificar-codigo-recuperacion',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('codigo').isLength({ min: 6, max: 6 }).withMessage('Código inválido'),
    validarResultado
  ],
  authControlador.verificarCodigoRecuperacion
);

router.post('/restablecer-password',
  [
    body('usuarioId').isInt().withMessage('ID de usuario inválido'),
    body('codigoId').isInt().withMessage('ID de código inválido'),
    body('nuevoPassword').isLength({ min: 6 }).withMessage('La contraseña debe tener mínimo 6 caracteres'),
    validarResultado
  ],
  authControlador.restablecerPassword
);

router.post('/cambiar-password',
  verificarToken,
  [
    body('passwordActual').notEmpty().withMessage('La contraseña actual es requerida'),
    body('nuevoPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener mínimo 6 caracteres'),
    validarResultado
  ],
  authControlador.cambiarPassword
);

module.exports = router;