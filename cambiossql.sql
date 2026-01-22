ALTER TABLE favoritos DROP FOREIGN KEY IF EXISTS favoritos_ibfk_2;
ALTER TABLE descargas DROP FOREIGN KEY IF EXISTS descargas_ibfk_2;

ALTER TABLE favoritos 
DROP COLUMN IF EXISTS wallpaper_id,
ADD COLUMN wallpaper_id VARCHAR(50) NOT NULL AFTER usuario_id,
ADD COLUMN titulo VARCHAR(200),
ADD COLUMN url_imagen VARCHAR(500),
ADD COLUMN url_thumbnail VARCHAR(500),
ADD COLUMN categoria_nombre VARCHAR(100),
ADD COLUMN resolucion VARCHAR(20),
ADD COLUMN mime_type VARCHAR(50),
ADD COLUMN tipo_wallpaper VARCHAR(20),
ADD COLUMN es_premium BOOLEAN DEFAULT FALSE;

ALTER TABLE descargas
DROP COLUMN IF EXISTS wallpaper_id,
ADD COLUMN wallpaper_id VARCHAR(50) NOT NULL AFTER usuario_id,
ADD COLUMN titulo VARCHAR(200),
ADD COLUMN url_imagen VARCHAR(500),
ADD COLUMN url_thumbnail VARCHAR(500),
ADD COLUMN categoria_nombre VARCHAR(100),
ADD COLUMN resolucion VARCHAR(20),
ADD COLUMN mime_type VARCHAR(50);

DROP INDEX IF EXISTS unique_favorito ON favoritos;
CREATE UNIQUE INDEX unique_favorito ON favoritos(usuario_id, wallpaper_id);

CREATE INDEX idx_wallpaper_id_fav ON favoritos(wallpaper_id);
CREATE INDEX idx_wallpaper_id_desc ON descargas(wallpaper_id);
CREATE INDEX idx_usuario_fecha_fav ON favoritos(usuario_id, fecha_agregado);
CREATE INDEX idx_usuario_fecha_desc ON descargas(usuario_id, fecha_descarga);