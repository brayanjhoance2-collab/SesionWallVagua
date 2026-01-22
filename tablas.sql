CREATE DATABASE wallpaper_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE wallpaper_app;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    apodo VARCHAR(100) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    puntos INT DEFAULT 0,
    es_premium BOOLEAN DEFAULT FALSE,
    fecha_inicio_premium TIMESTAMP NULL,
    fecha_fin_premium TIMESTAMP NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    verificado BOOLEAN DEFAULT FALSE,
    google_play_id VARCHAR(255) UNIQUE,
    avatar_url VARCHAR(500),
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_telefono (telefono),
    INDEX idx_puntos (puntos),
    INDEX idx_es_premium (es_premium),
    INDEX idx_fecha_fin_premium (fecha_fin_premium)
);

CREATE TABLE preferencias_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    edad INT,
    color_favorito VARCHAR(50),
    donde_nos_encontro VARCHAR(100),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE gustos_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_categoria (usuario_id, categoria)
);

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    icono_url VARCHAR(500),
    activa BOOLEAN DEFAULT TRUE,
    orden INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallpapers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200),
    url_imagen VARCHAR(500) NOT NULL,
    url_thumbnail VARCHAR(500),
    categoria_id INT,
    etiquetas TEXT,
    resolucion VARCHAR(20),
    tamaño_archivo INT,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    premium BOOLEAN DEFAULT FALSE,
    generado_ia BOOLEAN DEFAULT FALSE,
    usuario_creador_id INT,
    prompt_ia TEXT,
    modelo_ia VARCHAR(100),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_creador_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_categoria (categoria_id),
    INDEX idx_fecha_subida (fecha_subida),
    INDEX idx_premium (premium),
    INDEX idx_generado_ia (generado_ia),
    INDEX idx_usuario_creador (usuario_creador_id)
);

CREATE TABLE favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    wallpaper_id INT NOT NULL,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorito (usuario_id, wallpaper_id),
    INDEX idx_usuario_fecha (usuario_id, fecha_agregado)
);

CREATE TABLE descargas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    wallpaper_id INT NOT NULL,
    fecha_descarga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calidad_descarga ENUM('baja', 'media', 'alta', 'original') DEFAULT 'alta',
    dispositivo VARCHAR(200),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    INDEX idx_usuario_fecha (usuario_id, fecha_descarga),
    INDEX idx_wallpaper_fecha (wallpaper_id, fecha_descarga)
);

CREATE TABLE estadisticas_wallpapers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallpaper_id INT UNIQUE NOT NULL,
    total_vistas INT DEFAULT 0,
    total_descargas INT DEFAULT 0,
    total_favoritos INT DEFAULT 0,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    INDEX idx_total_vistas (total_vistas),
    INDEX idx_total_descargas (total_descargas)
);

CREATE TABLE colecciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    publica BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_publica (publica)
);

CREATE TABLE colecciones_wallpapers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coleccion_id INT NOT NULL,
    wallpaper_id INT NOT NULL,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    orden INT DEFAULT 0,
    FOREIGN KEY (coleccion_id) REFERENCES colecciones(id) ON DELETE CASCADE,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_coleccion_wallpaper (coleccion_id, wallpaper_id),
    INDEX idx_coleccion_orden (coleccion_id, orden)
);

CREATE TABLE reportes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    wallpaper_id INT NOT NULL,
    tipo_reporte ENUM('contenido_inapropiado', 'baja_calidad', 'copyright', 'otro') NOT NULL,
    descripcion TEXT,
    estado ENUM('pendiente', 'en_revision', 'resuelto', 'rechazado') DEFAULT 'pendiente',
    fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
    INDEX idx_estado (estado),
    INDEX idx_fecha_reporte (fecha_reporte)
);

CREATE TABLE configuracion_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE NOT NULL,
    notificaciones_activas BOOLEAN DEFAULT TRUE,
    notif_nuevos_wallpapers BOOLEAN DEFAULT TRUE,
    notif_renovacion_suscripcion BOOLEAN DEFAULT TRUE,
    notif_promociones BOOLEAN DEFAULT FALSE,
    calidad_descarga_predeterminada ENUM('baja', 'media', 'alta', 'original') DEFAULT 'alta',
    tema_app ENUM('claro', 'oscuro', 'automatico') DEFAULT 'automatico',
    idioma VARCHAR(10) DEFAULT 'es',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('nuevo_wallpaper', 'renovacion_suscripcion', 'promocion', 'sistema', 'coleccion_compartida', 'puntos_ganados') NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP NULL,
    datos_adicionales JSON,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_leida (usuario_id, leida),
    INDEX idx_fecha_envio (fecha_envio)
);

CREATE TABLE codigos_verificacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    codigo VARCHAR(6) NOT NULL,
    tipo_codigo ENUM('registro', 'recuperacion_password', 'cambio_password', 'verificacion_telefono', 'verificacion_email') NOT NULL,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_codigo_activo (codigo, usado, fecha_expiracion)
);

CREATE TABLE suscripciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    device_id VARCHAR(255),
    google_account_id VARCHAR(255),
    tipo_suscripcion ENUM('semanal', 'mensual', 'anual') NOT NULL,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP NOT NULL,
    estado ENUM('activa', 'cancelada', 'expirada') DEFAULT 'activa',
    monto_pagado DECIMAL(10, 2) NOT NULL,
    metodo_pago VARCHAR(50),
    google_play_purchase_token VARCHAR(500),
    google_play_order_id VARCHAR(255),
    google_play_product_id VARCHAR(100),
    google_play_package_name VARCHAR(255),
    purchase_time BIGINT,
    expiry_time DATETIME,
    auto_renewing TINYINT(1) DEFAULT 0,
    payment_state INT,
    country_code VARCHAR(10),
    price_currency_code VARCHAR(10),
    google_raw_response TEXT,
    fecha_renovacion TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_estado (usuario_id, estado),
    INDEX idx_fecha_fin (fecha_fin),
    INDEX idx_device_id (device_id),
    INDEX idx_google_account (google_account_id)
);

CREATE TABLE historial_pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    suscripcion_id INT NOT NULL,
    usuario_id INT NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_pago ENUM('exitoso', 'fallido', 'pendiente', 'reembolsado') DEFAULT 'exitoso',
    metodo_pago VARCHAR(50),
    transaccion_id VARCHAR(255),
    google_play_order_id VARCHAR(255),
    google_play_purchase_token VARCHAR(500),
    FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_fecha (usuario_id, fecha_pago)
);

CREATE TABLE logs_actividad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo_accion ENUM('login', 'logout', 'cambio_password', 'cambio_email', 'cancelacion_suscripcion', 'activacion_suscripcion', 'eliminacion_cuenta', 'generacion_ia', 'puntos_ganados', 'puntos_gastados') NOT NULL,
    descripcion TEXT,
    ip_address VARCHAR(45),
    dispositivo VARCHAR(200),
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    datos_adicionales JSON,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_fecha (usuario_id, fecha_accion),
    INDEX idx_tipo_accion (tipo_accion)
);

CREATE TABLE sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token_sesion VARCHAR(255) UNIQUE NOT NULL,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    dispositivo VARCHAR(200),
    ip_address VARCHAR(45),
    activa BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token_sesion),
    INDEX idx_usuario_activa (usuario_id, activa)
);

CREATE TABLE logs_compras_fallidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_token VARCHAR(500),
    product_id VARCHAR(100),
    motivo VARCHAR(255),
    detalles TEXT,
    fecha_intento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_purchase_token (purchase_token),
    INDEX idx_product_id (product_id)
);

CREATE TABLE datos_onboarding (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    age VARCHAR(50),
    source VARCHAR(100),
    frequency VARCHAR(50),
    categories TEXT,
    platform VARCHAR(20) DEFAULT 'android',
    app_version VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_device_id (device_id),
    INDEX idx_age (age),
    INDEX idx_source (source),
    INDEX idx_frequency (frequency),
    INDEX idx_platform (platform),
    INDEX idx_fecha_creacion (fecha_creacion)
);

CREATE TABLE leonardo_generaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    generation_id VARCHAR(255) UNIQUE NOT NULL,
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    modelo VARCHAR(100),
    ancho INT,
    alto INT,
    num_imagenes INT DEFAULT 1,
    estado ENUM('pendiente', 'procesando', 'completado', 'fallido') DEFAULT 'pendiente',
    url_resultado VARCHAR(500),
    tokens_usados INT,
    puntos_gastados INT DEFAULT 0,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_completado TIMESTAMP NULL,
    error_mensaje TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_fecha (usuario_id, fecha_solicitud),
    INDEX idx_generation_id (generation_id),
    INDEX idx_estado (estado)
);

CREATE TABLE eventos_puntos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    puntos_otorgados INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    limite_diario INT,
    limite_total INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre),
    INDEX idx_activo (activo)
);

CREATE TABLE historial_puntos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    evento_id INT,
    tipo_movimiento ENUM('ganancia', 'gasto') NOT NULL,
    puntos INT NOT NULL,
    descripcion VARCHAR(255),
    referencia_id INT,
    referencia_tipo VARCHAR(50),
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (evento_id) REFERENCES eventos_puntos(id) ON DELETE SET NULL,
    INDEX idx_usuario_fecha (usuario_id, fecha_movimiento),
    INDEX idx_tipo_movimiento (tipo_movimiento)
);

CREATE TABLE configuracion_leonardo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    modelo_default VARCHAR(100) DEFAULT 'leonardo-phoenix-1.0',
    tokens_diarios_max INT DEFAULT 150,
    puntos_por_generacion INT DEFAULT 10,
    activo BOOLEAN DEFAULT TRUE,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO configuracion_leonardo (modelo_default, tokens_diarios_max, puntos_por_generacion) VALUES
('leonardo-phoenix-1.0', 150, 10);

USE wallpaper_app;

INSERT INTO eventos_puntos (nombre, descripcion, puntos_otorgados, limite_diario, limite_total) VALUES
('registro_nuevo', 'Puntos por crear una cuenta nueva', 100, NULL, 1),
('login_diario', 'Puntos por iniciar sesión cada día', 5, 1, NULL),
('primera_descarga', 'Puntos por la primera descarga de wallpaper', 20, NULL, 1),
('compartir_app', 'Puntos por compartir la aplicación', 15, 3, NULL),
('referido_exitoso', 'Puntos por cada amigo que se registra con tu código', 50, NULL, NULL),
('descarga_wallpaper', 'Puntos por descargar wallpapers', 2, 10, NULL),
('crear_coleccion', 'Puntos por crear una colección', 10, 5, NULL),
('generacion_ia', 'Puntos bonus por generar wallpaper con IA', 25, NULL, NULL),
('rating_app', 'Puntos por calificar la app en Play Store', 30, NULL, 1),
('completar_perfil', 'Puntos por completar el perfil al 100%', 40, NULL, 1);


-- 1. Elimina las foreign keys
ALTER TABLE favoritos DROP FOREIGN KEY favoritos_ibfk_2;
ALTER TABLE descargas DROP FOREIGN KEY descargas_ibfk_2;

-- 2. Cambia el tipo de columna
ALTER TABLE favoritos MODIFY COLUMN wallpaper_id VARCHAR(50) NOT NULL;
ALTER TABLE descargas MODIFY COLUMN wallpaper_id VARCHAR(50) NOT NULL;

-- 3. Agrega índices (sin foreign keys)
ALTER TABLE favoritos ADD INDEX idx_wallpaper_id (wallpaper_id);
ALTER TABLE descargas ADD INDEX idx_wallpaper_id (wallpaper_id);