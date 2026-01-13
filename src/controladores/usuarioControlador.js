const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const obtenerPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const [usuarios] = await db.query(
      'SELECT id, nombre, email, fecha_registro FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (usuarios.length === 0) {
      return errorRespuesta(res, 'Usuario no encontrado', 404);
    }

    const [preferencias] = await db.query(
      'SELECT * FROM preferencias_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    const [configuracion] = await db.query(
      'SELECT * FROM configuracion_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    return exitoRespuesta(res, 'Perfil obtenido', {
      usuario: usuarios[0],
      preferencias: preferencias[0] || null,
      configuracion: configuracion[0] || null
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    return errorRespuesta(res, 'Error al obtener perfil', 500);
  }
};

const actualizarPreferencias = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { edad, colorFavorito, dondeNosEncontro } = req.body;

    const [existente] = await db.query(
      'SELECT id FROM preferencias_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    if (existente.length === 0) {
      await db.query(
        'INSERT INTO preferencias_usuario (usuario_id, edad, color_favorito, donde_nos_encontro) VALUES (?, ?, ?, ?)',
        [usuarioId, edad, colorFavorito, dondeNosEncontro]
      );
    } else {
      await db.query(
        'UPDATE preferencias_usuario SET edad = ?, color_favorito = ?, donde_nos_encontro = ? WHERE usuario_id = ?',
        [edad, colorFavorito, dondeNosEncontro, usuarioId]
      );
    }

    return exitoRespuesta(res, 'Preferencias actualizadas');
  } catch (error) {
    console.error('Error actualizando preferencias:', error);
    return errorRespuesta(res, 'Error al actualizar preferencias', 500);
  }
};

const actualizarGustos = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { categorias } = req.body;

    if (!Array.isArray(categorias)) {
      return errorRespuesta(res, 'Las categorías deben ser un array', 400);
    }

    await db.query('DELETE FROM gustos_usuario WHERE usuario_id = ?', [usuarioId]);

    for (const categoria of categorias) {
      await db.query(
        'INSERT INTO gustos_usuario (usuario_id, categoria) VALUES (?, ?)',
        [usuarioId, categoria]
      );
    }

    return exitoRespuesta(res, 'Gustos actualizados');
  } catch (error) {
    console.error('Error actualizando gustos:', error);
    return errorRespuesta(res, 'Error al actualizar gustos', 500);
  }
};

const actualizarConfiguracion = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const {
      notificacionesActivas,
      notifNuevosWallpapers,
      notifRenovacionSuscripcion,
      notifPromociones,
      calidadDescargaPredeterminada,
      temaApp,
      idioma
    } = req.body;

    const [existente] = await db.query(
      'SELECT id FROM configuracion_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    if (existente.length === 0) {
      await db.query(
        'INSERT INTO configuracion_usuario (usuario_id) VALUES (?)',
        [usuarioId]
      );
    }

    await db.query(`
      UPDATE configuracion_usuario SET
        notificaciones_activas = COALESCE(?, notificaciones_activas),
        notif_nuevos_wallpapers = COALESCE(?, notif_nuevos_wallpapers),
        notif_renovacion_suscripcion = COALESCE(?, notif_renovacion_suscripcion),
        notif_promociones = COALESCE(?, notif_promociones),
        calidad_descarga_predeterminada = COALESCE(?, calidad_descarga_predeterminada),
        tema_app = COALESCE(?, tema_app),
        idioma = COALESCE(?, idioma)
      WHERE usuario_id = ?
    `, [
      notificacionesActivas,
      notifNuevosWallpapers,
      notifRenovacionSuscripcion,
      notifPromociones,
      calidadDescargaPredeterminada,
      temaApp,
      idioma,
      usuarioId
    ]);

    return exitoRespuesta(res, 'Configuración actualizada');
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    return errorRespuesta(res, 'Error al actualizar configuración', 500);
  }
};

module.exports = {
  obtenerPerfil,
  actualizarPreferencias,
  actualizarGustos,
  actualizarConfiguracion
};