const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/baseDatos');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/servidor');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');
const { generarCodigoVerificacion, calcularExpiracion } = require('../utilidades/generadorCodigos');
const { enviarCodigoVerificacion } = require('../utilidades/enviarEmail');

const registro = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const [usuarioExistente] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarioExistente.length > 0) {
      return errorRespuesta(res, 'El email ya está registrado', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [resultado] = await db.query(
      'INSERT INTO usuarios (nombre, email, password_hash, activo) VALUES (?, ?, ?, ?)',
      [nombre, email, passwordHash, false]
    );

    const usuarioId = resultado.insertId;

    await db.query(
      'INSERT INTO configuracion_usuario (usuario_id) VALUES (?)',
      [usuarioId]
    );

    const codigo = generarCodigoVerificacion();
    const expiracion = calcularExpiracion(15);

    await db.query(
      'INSERT INTO codigos_verificacion (usuario_id, codigo, tipo_codigo, fecha_expiracion) VALUES (?, ?, ?, ?)',
      [usuarioId, codigo, 'registro', expiracion]
    );

    await enviarCodigoVerificacion(email, codigo, 'registro');

    return exitoRespuesta(res, 'Usuario registrado. Verifica tu email con el código enviado.', { usuarioId }, 201);
  } catch (error) {
    console.error('Error en registro:', error);
    return errorRespuesta(res, 'Error al registrar usuario', 500);
  }
};

const verificarCodigo = async (req, res) => {
  try {
    const { usuarioId, codigo } = req.body;

    const [codigos] = await db.query(
      'SELECT * FROM codigos_verificacion WHERE usuario_id = ? AND codigo = ? AND tipo_codigo = "registro" AND usado = FALSE AND fecha_expiracion > NOW()',
      [usuarioId, codigo]
    );

    if (codigos.length === 0) {
      return errorRespuesta(res, 'Código inválido o expirado', 400);
    }

    await db.query(
      'UPDATE codigos_verificacion SET usado = TRUE WHERE id = ?',
      [codigos[0].id]
    );

    await db.query(
      'UPDATE usuarios SET activo = TRUE WHERE id = ?',
      [usuarioId]
    );

    const [usuario] = await db.query(
      'SELECT id, nombre, email FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    const token = jwt.sign(
      { id: usuario[0].id, email: usuario[0].email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    return exitoRespuesta(res, 'Cuenta verificada exitosamente', {
      usuario: usuario[0],
      token
    });
  } catch (error) {
    console.error('Error verificando código:', error);
    return errorRespuesta(res, 'Error al verificar código', 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return errorRespuesta(res, 'Credenciales inválidas', 401);
    }

    const usuario = usuarios[0];

    if (!usuario.activo) {
      return errorRespuesta(res, 'Cuenta no verificada. Verifica tu email primero.', 403);
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      return errorRespuesta(res, 'Credenciales inválidas', 401);
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    await db.query(
      'INSERT INTO logs_actividad (usuario_id, tipo_accion, ip_address) VALUES (?, ?, ?)',
      [usuario.id, 'login', req.ip]
    );

    return exitoRespuesta(res, 'Login exitoso', {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
      },
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    return errorRespuesta(res, 'Error al iniciar sesión', 500);
  }
};

const solicitarRecuperacionPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const [usuarios] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return exitoRespuesta(res, 'Si el email existe, recibirás un código de recuperación');
    }

    const usuarioId = usuarios[0].id;
    const codigo = generarCodigoVerificacion();
    const expiracion = calcularExpiracion(15);

    await db.query(
      'INSERT INTO codigos_verificacion (usuario_id, codigo, tipo_codigo, fecha_expiracion) VALUES (?, ?, ?, ?)',
      [usuarioId, codigo, 'recuperacion_password', expiracion]
    );

    await enviarCodigoVerificacion(email, codigo, 'recuperacion_password');

    return exitoRespuesta(res, 'Si el email existe, recibirás un código de recuperación');
  } catch (error) {
    console.error('Error solicitando recuperación:', error);
    return errorRespuesta(res, 'Error al solicitar recuperación', 500);
  }
};

const verificarCodigoRecuperacion = async (req, res) => {
  try {
    const { email, codigo } = req.body;

    const [usuarios] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return errorRespuesta(res, 'Código inválido', 400);
    }

    const usuarioId = usuarios[0].id;

    const [codigos] = await db.query(
      'SELECT * FROM codigos_verificacion WHERE usuario_id = ? AND codigo = ? AND tipo_codigo = "recuperacion_password" AND usado = FALSE AND fecha_expiracion > NOW()',
      [usuarioId, codigo]
    );

    if (codigos.length === 0) {
      return errorRespuesta(res, 'Código inválido o expirado', 400);
    }

    return exitoRespuesta(res, 'Código válido', { usuarioId, codigoId: codigos[0].id });
  } catch (error) {
    console.error('Error verificando código:', error);
    return errorRespuesta(res, 'Error al verificar código', 500);
  }
};

const restablecerPassword = async (req, res) => {
  try {
    const { usuarioId, codigoId, nuevoPassword } = req.body;

    const passwordHash = await bcrypt.hash(nuevoPassword, 10);

    await db.query(
      'UPDATE usuarios SET password_hash = ? WHERE id = ?',
      [passwordHash, usuarioId]
    );

    await db.query(
      'UPDATE codigos_verificacion SET usado = TRUE WHERE id = ?',
      [codigoId]
    );

    await db.query(
      'INSERT INTO logs_actividad (usuario_id, tipo_accion) VALUES (?, ?)',
      [usuarioId, 'cambio_password']
    );

    return exitoRespuesta(res, 'Contraseña restablecida exitosamente');
  } catch (error) {
    console.error('Error restableciendo password:', error);
    return errorRespuesta(res, 'Error al restablecer contraseña', 500);
  }
};

const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, nuevoPassword } = req.body;
    const usuarioId = req.usuarioId;

    const [usuarios] = await db.query(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    const passwordValido = await bcrypt.compare(passwordActual, usuarios[0].password_hash);

    if (!passwordValido) {
      return errorRespuesta(res, 'Contraseña actual incorrecta', 400);
    }

    const passwordHash = await bcrypt.hash(nuevoPassword, 10);

    await db.query(
      'UPDATE usuarios SET password_hash = ? WHERE id = ?',
      [passwordHash, usuarioId]
    );

    await db.query(
      'INSERT INTO logs_actividad (usuario_id, tipo_accion) VALUES (?, ?)',
      [usuarioId, 'cambio_password']
    );

    return exitoRespuesta(res, 'Contraseña cambiada exitosamente');
  } catch (error) {
    console.error('Error cambiando password:', error);
    return errorRespuesta(res, 'Error al cambiar contraseña', 500);
  }
};

module.exports = {
  registro,
  verificarCodigo,
  login,
  solicitarRecuperacionPassword,
  verificarCodigoRecuperacion,
  restablecerPassword,
  cambiarPassword
};