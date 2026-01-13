const db = require('../config/baseDatos');
const { exitoRespuesta, errorRespuesta } = require('../utilidades/respuestas');

const guardarDatosOnboarding = async (req, res) => {
  try {
    const { deviceId, age, source, frequency, categories, platform, appVersion } = req.body;

    if (!deviceId) {
      return errorRespuesta(res, 'Device ID requerido', 400);
    }

    const [existente] = await db.query(
      'SELECT id FROM datos_onboarding WHERE device_id = ?',
      [deviceId]
    );

    if (existente.length > 0) {
      await db.query(
        `UPDATE datos_onboarding SET 
         age = ?, source = ?, frequency = ?, categories = ?,
         platform = ?, app_version = ?, fecha_actualizacion = NOW()
         WHERE device_id = ?`,
        [age, source, frequency, categories, platform, appVersion, deviceId]
      );

      return exitoRespuesta(res, 'Datos de onboarding actualizados', {
        deviceId,
        updated: true
      });
    } else {
      await db.query(
        `INSERT INTO datos_onboarding 
         (device_id, age, source, frequency, categories, platform, app_version)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [deviceId, age, source, frequency, categories, platform, appVersion]
      );

      return exitoRespuesta(res, 'Datos de onboarding guardados', {
        deviceId,
        created: true
      }, 201);
    }
  } catch (error) {
    console.error('Error guardando onboarding:', error);
    return errorRespuesta(res, 'Error al guardar datos de onboarding', 500);
  }
};

const obtenerEstadisticas = async (req, res) => {
  try {
    const [totalUsuarios] = await db.query(
      'SELECT COUNT(*) as total FROM datos_onboarding'
    );

    const [porEdad] = await db.query(`
      SELECT age, COUNT(*) as total 
      FROM datos_onboarding 
      WHERE age IS NOT NULL 
      GROUP BY age
    `);

    const [porFuente] = await db.query(`
      SELECT source, COUNT(*) as total 
      FROM datos_onboarding 
      WHERE source IS NOT NULL 
      GROUP BY source
    `);

    const [porFrecuencia] = await db.query(`
      SELECT frequency, COUNT(*) as total 
      FROM datos_onboarding 
      WHERE frequency IS NOT NULL 
      GROUP BY frequency
    `);

    const [categoriasMasPopulares] = await db.query(`
      SELECT categories, COUNT(*) as total 
      FROM datos_onboarding 
      WHERE categories IS NOT NULL 
      GROUP BY categories
      ORDER BY total DESC
      LIMIT 10
    `);

    return exitoRespuesta(res, 'Estadísticas de onboarding', {
      totalUsuarios: totalUsuarios[0].total,
      porEdad,
      porFuente,
      porFrecuencia,
      categoriasMasPopulares
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return errorRespuesta(res, 'Error al obtener estadísticas', 500);
  }
};

module.exports = {
  guardarDatosOnboarding,
  obtenerEstadisticas
};