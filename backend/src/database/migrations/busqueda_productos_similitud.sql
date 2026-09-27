-- Búsqueda tolerante a errores ortográficos para el autocompletado de productos.
-- Debe ejecutarse con un usuario que tenga permiso para CREATE EXTENSION.

BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent depende de un diccionario configurable y PostgreSQL la declara STABLE.
-- Este envoltorio fija la normalización usada por los índices de búsqueda.
CREATE OR REPLACE FUNCTION normalizar_texto_busqueda(valor TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT regexp_replace(
    lower(unaccent('unaccent', valor)),
    '[^[:alnum:]]+',
    '',
    'g'
  );
$$;

CREATE INDEX IF NOT EXISTS idx_producto_busqueda_codigo_trgm
  ON producto USING GIN (normalizar_texto_busqueda(codigo) gin_trgm_ops)
  WHERE activo = TRUE;

CREATE INDEX IF NOT EXISTS idx_producto_busqueda_comercial_trgm
  ON producto USING GIN (normalizar_texto_busqueda(nombre_comercial) gin_trgm_ops)
  WHERE activo = TRUE;

CREATE INDEX IF NOT EXISTS idx_producto_busqueda_generico_trgm
  ON producto USING GIN (normalizar_texto_busqueda(nombre_generico) gin_trgm_ops)
  WHERE activo = TRUE;

COMMIT;
