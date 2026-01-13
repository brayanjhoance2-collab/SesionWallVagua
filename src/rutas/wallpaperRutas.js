const express = require('express');
const router = express.Router();
const wallpaperControlador = require('../controladores/wallpaperControlador');
const { verificarToken } = require('../middlewares/autenticacion');

router.get('/', wallpaperControlador.obtenerWallpapers);
router.get('/tendencias', wallpaperControlador.obtenerTendencias);
router.get('/recomendados', verificarToken, wallpaperControlador.obtenerRecomendados);
router.get('/:id', wallpaperControlador.obtenerWallpaperPorId);

module.exports = router;