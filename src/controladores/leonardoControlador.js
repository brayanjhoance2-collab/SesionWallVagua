const axios = require('axios');
const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

const generarWallpaper = async (req, res) => {
  try {
    const { prompt, negativePrompt, width, height, numImages } = req.body;
    const usuarioId = req.usuarioId;

    const [usuario] = await db.query(
      'SELECT puntos FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    const puntosRequeridos = parseInt(process.env.LEONARDO_PUNTOS_POR_GENERACION) || 10;

    if (usuario[0].puntos < puntosRequeridos) {
      return errorRespuesta(res, `Necesitas al menos ${puntosRequeridos} puntos para generar un wallpaper`, 400);
    }

    const response = await axios.post(
      `${LEONARDO_API_URL}/generations`,
      {
        prompt: prompt,
        negative_prompt: negativePrompt || '',
        modelId: process.env.LEONARDO_MODEL_DEFAULT || 'leonardo-phoenix-1.0',
        width: width || 1024,
        height: height || 1792,
        num_images: numImages || 1,
        guidance_scale: 7,
        sd_version: 'SDXL_1_0'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const generationId = response.data.sdGenerationJob.generationId;

    const [resultado] = await db.query(
      `INSERT INTO leonardo_generaciones 
      (usuario_id, generation_id, prompt, negative_prompt, modelo, ancho, alto, num_imagenes, estado) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        generationId,
        prompt,
        negativePrompt || null,
        process.env.LEONARDO_MODEL_DEFAULT,
        width || 1024,
        height || 1792,
        numImages || 1,
        'procesando'
      ]
    );

    await db.query(
      'UPDATE usuarios SET puntos = puntos - ? WHERE id = ?',
      [puntosRequeridos, usuarioId]
    );

    await db.query(
      `INSERT INTO historial_puntos 
      (usuario_id, tipo_movimiento, puntos, descripcion, referencia_id, referencia_tipo) 
      VALUES (?, "gasto", ?, "Generación de wallpaper con IA", ?, "leonardo_generacion")`,
      [usuarioId, puntosRequeridos, resultado.insertId]
    );

    await db.query(
      'UPDATE leonardo_generaciones SET puntos_gastados = ? WHERE id = ?',
      [puntosRequeridos, resultado.insertId]
    );

    await db.query(
      'INSERT INTO logs_actividad (usuario_id, tipo_accion, descripcion) VALUES (?, ?, ?)',
      [usuarioId, 'generacion_ia', `Generación iniciada: ${prompt.substring(0, 50)}...`]
    );

    return exitoRespuesta(res, 'Generación iniciada', {
      generacionId: resultado.insertId,
      leonardoGenerationId: generationId,
      puntosGastados: puntosRequeridos,
      puntosRestantes: usuario[0].puntos - puntosRequeridos
    }, 201);
  } catch (error) {
    console.error('Error generando wallpaper:', error.response?.data || error);
    return errorRespuesta(res, 'Error al generar wallpaper con Leonardo.AI', 500);
  }
};

const verificarEstado = async (req, res) => {
  try {
    const { generacionId } = req.params;
    const usuarioId = req.usuarioId;

    const [generacion] = await db.query(
      'SELECT * FROM leonardo_generaciones WHERE id = ? AND usuario_id = ?',
      [generacionId, usuarioId]
    );

    if (generacion.length === 0) {
      return errorRespuesta(res, 'Generación no encontrada', 404);
    }

    if (generacion[0].estado === 'completado') {
      return exitoRespuesta(res, 'Generación completada', {
        estado: 'completado',
        url_resultado: generacion[0].url_resultado
      });
    }

    if (generacion[0].estado === 'fallido') {
      return exitoRespuesta(res, 'Generación fallida', {
        estado: 'fallido',
        error: generacion[0].error_mensaje
      });
    }

    const response = await axios.get(
      `${LEONARDO_API_URL}/generations/${generacion[0].generation_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`
        }
      }
    );

    const generationData = response.data.generations_by_pk;

    if (generationData.status === 'COMPLETE') {
      const imageUrl = generationData.generated_images[0]?.url;

      await db.query(
        'UPDATE leonardo_generaciones SET estado = "completado", url_resultado = ?, fecha_completado = NOW() WHERE id = ?',
        [imageUrl, generacionId]
      );

      const [wallpaperResult] = await db.query(
        `INSERT INTO wallpapers 
        (titulo, url_imagen, generado_ia, usuario_creador_id, prompt_ia, modelo_ia, resolucion, activo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AI: ${generacion[0].prompt.substring(0, 50)}...`,
          imageUrl,
          true,
          usuarioId,
          generacion[0].prompt,
          generacion[0].modelo,
          `${generacion[0].ancho}x${generacion[0].alto}`,
          true
        ]
      );

      await db.query(
        'INSERT INTO estadisticas_wallpapers (wallpaper_id) VALUES (?)',
        [wallpaperResult.insertId]
      );

      const [evento] = await db.query(
        'SELECT id, puntos_otorgados FROM eventos_puntos WHERE nombre = "generacion_ia" AND activo = TRUE'
      );

      if (evento.length > 0) {
        await db.query(
          'UPDATE usuarios SET puntos = puntos + ? WHERE id = ?',
          [evento[0].puntos_otorgados, usuarioId]
        );

        await db.query(
          `INSERT INTO historial_puntos 
          (usuario_id, evento_id, tipo_movimiento, puntos, descripcion, referencia_id, referencia_tipo) 
          VALUES (?, ?, "ganancia", ?, "Bonus por generar wallpaper con IA", ?, "wallpaper")`,
          [usuarioId, evento[0].id, evento[0].puntos_otorgados, wallpaperResult.insertId]
        );
      }

      return exitoRespuesta(res, 'Generación completada', {
        estado: 'completado',
        url_resultado: imageUrl,
        wallpaper_id: wallpaperResult.insertId
      });
    }

    if (generationData.status === 'FAILED') {
      await db.query(
        'UPDATE leonardo_generaciones SET estado = "fallido", error_mensaje = ? WHERE id = ?',
        ['Generación fallida en Leonardo.AI', generacionId]
      );

      return exitoRespuesta(res, 'Generación fallida', {
        estado: 'fallido'
      });
    }

    return exitoRespuesta(res, 'Generación en proceso', {
      estado: 'procesando'
    });
  } catch (error) {
    console.error('Error verificando estado:', error);
    return errorRespuesta(res, 'Error al verificar estado', 500);
  }
};

const obtenerHistorial = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { limite = 20, pagina = 1 } = req.query;
    const offset = (pagina - 1) * limite;

    const [generaciones] = await db.query(
      `SELECT * FROM leonardo_generaciones 
      WHERE usuario_id = ? 
      ORDER BY fecha_solicitud DESC 
      LIMIT ? OFFSET ?`,
      [usuarioId, parseInt(limite), parseInt(offset)]
    );

    const [total] = await db.query(
      'SELECT COUNT(*) as total FROM leonardo_generaciones WHERE usuario_id = ?',
      [usuarioId]
    );

    return exitoRespuesta(res, 'Historial obtenido', {
      generaciones,
      paginacion: {
        total: total[0].total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(total[0].total / limite)
      }
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return errorRespuesta(res, 'Error al obtener historial', 500);
  }
};

module.exports = {
  generarWallpaper,
  verificarEstado,
  obtenerHistorial
};