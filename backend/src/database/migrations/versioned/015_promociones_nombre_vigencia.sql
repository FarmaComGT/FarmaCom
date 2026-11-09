ALTER TABLE promocion ADD COLUMN IF NOT EXISTS nombre VARCHAR(120);
ALTER TABLE promocion ALTER COLUMN fecha_fin DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promocion_sucursal_vigencia
    ON promocion (id_sucursal, activo, fecha_inicio, fecha_fin);
