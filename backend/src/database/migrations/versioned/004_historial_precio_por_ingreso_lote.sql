-- Prepara el historial de precios para registrar la evolución producida por
-- el ingreso de nuevos lotes. Se conserva la compatibilidad con el código
-- actual, que todavía registra las ediciones como correcciones.

ALTER TABLE lote
    ADD COLUMN IF NOT EXISTS fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE historial_precio_lote
    ADD COLUMN IF NOT EXISTS origen VARCHAR(30);

UPDATE historial_precio_lote
SET origen = 'correccion_lote'
WHERE origen IS NULL;

ALTER TABLE historial_precio_lote
    ALTER COLUMN origen SET DEFAULT 'correccion_lote',
    ALTER COLUMN origen SET NOT NULL,
    ALTER COLUMN valor_anterior DROP NOT NULL,
    DROP CONSTRAINT IF EXISTS chk_historial_origen,
    DROP CONSTRAINT IF EXISTS chk_historial_valores_no_negativos,
    DROP CONSTRAINT IF EXISTS chk_historial_valores_distintos;

ALTER TABLE historial_precio_lote
    ADD CONSTRAINT chk_historial_origen
        CHECK (origen IN ('ingreso_lote', 'correccion_lote')),
    ADD CONSTRAINT chk_historial_valores_no_negativos
        CHECK (
            (valor_anterior IS NULL OR valor_anterior >= 0)
            AND valor_nuevo >= 0
        ),
    ADD CONSTRAINT chk_historial_valores_distintos
        CHECK (valor_anterior IS NULL OR valor_anterior <> valor_nuevo);

CREATE INDEX IF NOT EXISTS idx_lote_producto_sucursal_ingreso
    ON lote (id_producto, id_sucursal, fecha_ingreso DESC, id_lote DESC);

COMMENT ON COLUMN lote.fecha_ingreso IS
    'Momento en que el lote fue registrado en el inventario.';

COMMENT ON COLUMN historial_precio_lote.origen IS
    'Operación que originó el registro: ingreso de lote o corrección de un lote existente.';
