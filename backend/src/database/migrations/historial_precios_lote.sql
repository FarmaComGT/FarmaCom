-- SCRUM-260: historial de cambios de precios por lote.
-- El precio de compra del producto se usa para inicializar los lotes existentes;
-- a partir de esta migracion cada lote conserva su costo de compra efectivo.

BEGIN;

-- La vista usa lote.* y debe recrearse para exponer la nueva columna.
DROP VIEW IF EXISTS v_lote_estado;

ALTER TABLE lote
    ADD COLUMN IF NOT EXISTS precio_compra NUMERIC(10,2);

UPDATE lote l
SET precio_compra = p.precio_compra
FROM producto p
WHERE p.id_producto = l.id_producto
  AND l.precio_compra IS NULL;

ALTER TABLE lote
    ALTER COLUMN precio_compra SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_lote_precio_compra_no_negativo'
          AND conrelid = 'lote'::regclass
    ) THEN
        ALTER TABLE lote
            ADD CONSTRAINT chk_lote_precio_compra_no_negativo
            CHECK (precio_compra >= 0);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS historial_precio_lote (
    id_historial_precio BIGSERIAL PRIMARY KEY,
    id_lote             INTEGER       NOT NULL,
    tipo_precio         VARCHAR(10)   NOT NULL,
    valor_anterior      NUMERIC(10,2) NOT NULL,
    valor_nuevo         NUMERIC(10,2) NOT NULL,
    id_usuario          INTEGER       NOT NULL,
    fecha_cambio        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_historial_precio_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT fk_historial_precio_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_historial_tipo_precio
        CHECK (tipo_precio IN ('compra', 'venta')),

    CONSTRAINT chk_historial_valores_no_negativos
        CHECK (valor_anterior >= 0 AND valor_nuevo >= 0),

    CONSTRAINT chk_historial_valores_distintos
        CHECK (valor_anterior <> valor_nuevo)
);

CREATE INDEX IF NOT EXISTS idx_historial_precio_lote_fecha
    ON historial_precio_lote (id_lote, fecha_cambio DESC, id_historial_precio DESC);

CREATE VIEW v_lote_estado AS
SELECT
    l.*,
    CASE
        WHEN l.fecha_vencimiento < CURRENT_DATE
            THEN 'vencido'
        WHEN l.fecha_vencimiento <= (CURRENT_DATE + (p.meses_alerta_vencimiento || ' months')::INTERVAL)
            THEN 'proximo_a_vencer'
        ELSE 'normal'
    END AS estado_vencimiento,
    CASE
        WHEN l.stock_actual = 0
            THEN 'agotado'
        WHEN l.stock_actual <= p.stock_minimo
            THEN 'poco_stock'
        ELSE 'normal'
    END AS estado_stock
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto;

COMMIT;
