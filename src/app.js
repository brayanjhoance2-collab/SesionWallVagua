const express = require('express');
const cors = require('cors');

const authRutas = require('./rutas/authRutas');
const usuarioRutas = require('./rutas/usuarioRutas');
const wallpaperRutas = require('./rutas/wallpaperRutas');
const suscripcionRutas = require('./rutas/suscripcionRutas');
const favoritoRutas = require('./rutas/favoritoRutas');
const descargaRutas = require('./rutas/descargaRutas');
const coleccionRutas = require('./rutas/coleccionRutas');
const notificacionRutas = require('./rutas/notificacionRutas');
const categoriaRutas = require('./rutas/categoriaRutas');
const onboardingRutas = require('./rutas/onboardingRutas');
const leonardoRutas = require('./rutas/leonardoRutas');
const puntosRutas = require('./rutas/puntosRutas');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ mensaje: 'API Wallpaper funcionando correctamente' });
});

app.use('/api/auth', authRutas);
app.use('/api/usuarios', usuarioRutas);
app.use('/api/wallpapers', wallpaperRutas);
app.use('/api/suscripciones', suscripcionRutas);
app.use('/api/favoritos', favoritoRutas);
app.use('/api/descargas', descargaRutas);
app.use('/api/colecciones', coleccionRutas);
app.use('/api/notificaciones', notificacionRutas);
app.use('/api/categorias', categoriaRutas);
app.use('/api/onboarding', onboardingRutas);
app.use('/api/leonardo', leonardoRutas);
app.use('/api/puntos', puntosRutas);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    exito: false, 
    mensaje: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;