ALTER TABLE promocion ADD COLUMN IF NOT EXISTS cantidad_maxima INTEGER
    CHECK (cantidad_maxima IS NULL OR (cantidad_maxima > 0 AND cantidad_maxima >= cantidad_minima));

-- El último cupo puede repartir un mismo lote entre dos precios históricos.
ALTER TABLE detalle_venta DROP CONSTRAINT IF EXISTS uq_detalle_venta_lote;
ALTER TABLE detalle_venta DROP CONSTRAINT IF EXISTS uq_detalle_venta_lote_precio;
ALTER TABLE detalle_venta ADD CONSTRAINT uq_detalle_venta_lote_precio
    UNIQUE (id_venta, id_lote, precio_unitario);

-- Se registra el uso desde esta migración; las ventas antiguas no guardaban
-- la promoción aplicada y no permiten atribuir unidades de forma fiable.
CREATE TABLE IF NOT EXISTS promocion_uso (
    id_uso BIGSERIAL PRIMARY KEY,
    id_promocion INTEGER NOT NULL REFERENCES promocion(id_promocion) ON DELETE RESTRICT,
    id_venta INTEGER REFERENCES venta(id_venta) ON DELETE RESTRICT,
    id_pago_pos INTEGER REFERENCES pago_pos(id_pago_pos) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    estado VARCHAR(12) NOT NULL CHECK (estado IN ('reservada', 'confirmada', 'liberada')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((id_venta IS NOT NULL) <> (id_pago_pos IS NOT NULL)),
    UNIQUE (id_promocion, id_venta),
    UNIQUE (id_promocion, id_pago_pos)
);
CREATE INDEX IF NOT EXISTS idx_promocion_uso_cupo ON promocion_uso(id_promocion, estado);

CREATE OR REPLACE VIEW v_promocion_cupo AS
SELECT pr.*, COALESCE(u.vendida, 0)::BIGINT AS cantidad_vendida,
    COALESCE(u.reservada, 0)::BIGINT AS cantidad_reservada,
    CASE WHEN pr.cantidad_maxima IS NULL THEN NULL
      ELSE GREATEST(0, pr.cantidad_maxima - COALESCE(u.vendida, 0) - COALESCE(u.reservada, 0))::BIGINT
    END AS cantidad_disponible
FROM promocion pr
LEFT JOIN LATERAL (
    SELECT SUM(cantidad) FILTER (WHERE estado = 'confirmada') AS vendida,
           SUM(cantidad) FILTER (WHERE estado = 'reservada') AS reservada
    FROM promocion_uso WHERE id_promocion = pr.id_promocion
) u ON TRUE;
