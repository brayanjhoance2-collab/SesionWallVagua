const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/baseDatos');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/servidor');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');
const { generarCodigoVerificacion, calcularExpiracion } = require('../utilidades/generadorCodigos');
const { enviarCodigoVerificacion } = require('../utilidades/enviarEmail');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registroGoogle = async (req, res) => {
  try {
    const { googleToken } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    const [usuarioExistente] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? OR google_play_id = ?',
      [email, googleId]
    );

    if (usuarioExistente.length > 0) {
      const usuario = usuarioExistente[0];

      if (!usuario.verificado) {
        await db.query(
          'UPDATE usuarios SET verificado = TRUE, activo = TRUE WHERE id = ?',
          [usuario.id]
        );
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

      const [suscripcionActiva] = await db.query(
        'SELECT * FROM suscripciones WHERE usuario_id = ? AND estado = "activa" AND fecha_fin > NOW() LIMIT 1',
        [usuario.id]
      );

      if (suscripcionActiva.length > 0) {
        await db.query(
          'UPDATE usuarios SET es_premium = TRUE, fecha_fin_premium = ? WHERE id = ?',
          [suscripcionActiva[0].fecha_fin, usuario.id]
        );
      }

      return exitoRespuesta(res, 'Login con Google exitoso', {
        usuario: {
          id: usuario.id,
          username: usuario.username,
          apodo: usuario.apodo,
          nombre_completo: usuario.nombre_completo,
          email: usuario.email,
          puntos: usuario.puntos,
          es_premium: usuario.es_premium,
          avatar_url: usuario.avatar_url
        },
        token
      });
    }

    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    const apodo = name || username;

    const [resultado] = await db.query(
      `INSERT INTO usuarios 
      (username, apodo, nombre_completo, email, password_hash, google_play_id, avatar_url, verificado, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, apodo, name, email, '', googleId, picture, true, true]
    );

    const usuarioId = resultado.insertId;

    await db.query(
      'INSERT INTO configuracion_usuario (usuario_id) VALUES (?)',
      [usuarioId]
    );

    await db.query(
      'INSERT INTO historial_puntos (usuario_id, evento_id, tipo_movimiento, puntos, descripcion) VALUES (?, (SELECT id FROM eventos_puntos WHERE nombre = "registro_nuevo"), "ganancia", 100, "Puntos por registro")',
      [usuarioId]
    );

    await db.query(
      'UPDATE usuarios SET puntos = 100 WHERE id = ?',
      [usuarioId]
    );

    await db.query(
      'INSERT INTO logs_actividad (usuario_id, tipo_accion, ip_address, descripcion) VALUES (?, ?, ?, ?)',
      [usuarioId, 'login', req.ip, 'Registro via Google']
    );

    const token = jwt.sign(
      { id: usuarioId, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    return exitoRespuesta(res, 'Registro con Google exitoso', {
      usuario: {
        id: usuarioId,
        username,
        apodo,
        nombre_completo: name,
        email,
        puntos: 100,
        es_premium: false,
        avatar_url: picture
      },
      token
    }, 201);
  } catch (error) {
    console.error('Error en registro Google:', error);
    return errorRespuesta(res, 'Error al registrar con Google', 500);
  }
};

const registro = async (req, res) => {
  try {
    const { username, apodo, nombreCompleto, email, telefono, password } = req.body;

    const [usuarioExistente] = await db.query(
      'SELECT id FROM usuarios WHERE email = ? OR username = ? OR (telefono IS NOT NULL AND telefono = ?)',
      [email, username, telefono]
    );

    if (usuarioExistente.length > 0) {
      return errorRespuesta(res, 'Email, username o teléfono ya registrado', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [resultado] = await db.query(
      `INSERT INTO usuarios 
      (username, apodo, nombre_completo, email, telefono, password_hash, activo, verificado) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, apodo, nombreCompleto, email, telefono || null, passwordHash, false, false]
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
      'UPDATE usuarios SET activo = TRUE, verificado = TRUE WHERE id = ?',
      [usuarioId]
    );

    await db.query(
      'INSERT INTO historial_puntos (usuario_id, evento_id, tipo_movimiento, puntos, descripcion) VALUES (?, (SELECT id FROM eventos_puntos WHERE nombre = "registro_nuevo"), "ganancia", 100, "Puntos por registro")',
      [usuarioId]
    );

    await db.query(
      'UPDATE usuarios SET puntos = 100 WHERE id = ?',
      [usuarioId]
    );

    const [usuario] = await db.query(
      'SELECT id, username, apodo, nombre_completo, email, puntos, es_premium FROM usuarios WHERE id = ?',
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

    if (!usuario.activo || !usuario.verificado) {
      return errorRespuesta(res, 'Cuenta no verificada. Verifica tu email primero.', 403);
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      return errorRespuesta(res, 'Credenciales inválidas', 401);
    }

    const [loginHoy] = await db.query(
      'SELECT * FROM historial_puntos WHERE usuario_id = ? AND evento_id = (SELECT id FROM eventos_puntos WHERE nombre = "login_diario") AND DATE(fecha_movimiento) = CURDATE()',
      [usuario.id]
    );

    if (loginHoy.length === 0) {
      await db.query(
        'INSERT INTO historial_puntos (usuario_id, evento_id, tipo_movimiento, puntos, descripcion) VALUES (?, (SELECT id FROM eventos_puntos WHERE nombre = "login_diario"), "ganancia", 5, "Login diario")',
        [usuario.id]
      );

      await db.query(
        'UPDATE usuarios SET puntos = puntos + 5 WHERE id = ?',
        [usuario.id]
      );
    }

    const [suscripcionActiva] = await db.query(
      'SELECT * FROM suscripciones WHERE usuario_id = ? AND estado = "activa" AND fecha_fin > NOW() LIMIT 1',
      [usuario.id]
    );

    if (suscripcionActiva.length > 0) {
      await db.query(
        'UPDATE usuarios SET es_premium = TRUE, fecha_inicio_premium = ?, fecha_fin_premium = ? WHERE id = ?',
        [suscripcionActiva[0].fecha_inicio, suscripcionActiva[0].fecha_fin, usuario.id]
      );
    } else {
      await db.query(
        'UPDATE usuarios SET es_premium = FALSE, fecha_fin_premium = NULL WHERE id = ?',
        [usuario.id]
      );
    }

    const [usuarioActualizado] = await db.query(
      'SELECT id, username, apodo, nombre_completo, email, telefono, puntos, es_premium, fecha_fin_premium, avatar_url FROM usuarios WHERE id = ?',
      [usuario.id]
    );

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
      usuario: usuarioActualizado[0],
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
  registroGoogle,
  verificarCodigo,
  login,
  solicitarRecuperacionPassword,
  verificarCodigoRecuperacion,
  restablecerPassword,
  cambiarPassword
};