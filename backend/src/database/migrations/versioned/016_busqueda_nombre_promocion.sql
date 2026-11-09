CREATE INDEX IF NOT EXISTS idx_promocion_nombre_busqueda
    ON promocion USING GIN (normalizar_texto_busqueda(nombre) gin_trgm_ops);
