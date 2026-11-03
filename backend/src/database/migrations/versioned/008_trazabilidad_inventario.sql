-- Evita sobrescrituras silenciosas y conserva la identidad que tuvo cada
-- producto/lote al momento de una venta.
ALTER TABLE lote
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE lote
    DROP CONSTRAINT IF EXISTS chk_lote_version_positiva;

ALTER TABLE lote
    ADD CONSTRAINT chk_lote_version_positiva CHECK (version > 0);

-- PostgreSQL expande l.* al crear una vista. Se recrea para que las bases
-- existentes también expongan version en las consultas de lotes.
DROP VIEW IF EXISTS v_lote_estado;

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

ALTER TABLE detalle_venta
    ADD COLUMN IF NOT EXISTS id_producto_historico INTEGER,
    ADD COLUMN IF NOT EXISTS numero_lote_historico VARCHAR(100),
    ADD COLUMN IF NOT EXISTS nombre_producto_historico VARCHAR(200);

UPDATE detalle_venta dv
SET id_producto_historico = l.id_producto,
    numero_lote_historico = l.numero_lote,
    nombre_producto_historico = p.nombre_comercial
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto
WHERE dv.id_lote = l.id_lote
  AND (
    dv.id_producto_historico IS NULL
    OR dv.numero_lote_historico IS NULL
    OR dv.nombre_producto_historico IS NULL
  );

ALTER TABLE detalle_venta
    ALTER COLUMN id_producto_historico SET NOT NULL,
    ALTER COLUMN numero_lote_historico SET NOT NULL,
    ALTER COLUMN nombre_producto_historico SET NOT NULL;

ALTER TABLE detalle_venta
    DROP CONSTRAINT IF EXISTS fk_detalle_venta_producto_historico;

ALTER TABLE detalle_venta
    ADD CONSTRAINT fk_detalle_venta_producto_historico
    FOREIGN KEY (id_producto_historico)
    REFERENCES producto(id_producto)
    ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS movimiento_inventario (
    id_movimiento       BIGSERIAL     PRIMARY KEY,
    id_lote             INTEGER       NOT NULL,
    tipo                VARCHAR(20)   NOT NULL,
    cantidad_anterior   INTEGER       NOT NULL CHECK (cantidad_anterior >= 0),
    cantidad_nueva      INTEGER       NOT NULL CHECK (cantidad_nueva >= 0),
    id_usuario          INTEGER       NOT NULL,
    fecha_movimiento    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_sucursal         INTEGER       NOT NULL,
    motivo              VARCHAR(500)  NOT NULL,
    referencia          VARCHAR(150),

    CONSTRAINT chk_movimiento_inventario_tipo
        CHECK (tipo IN ('entrada', 'venta', 'anulacion', 'ajuste')),
    CONSTRAINT chk_movimiento_inventario_cambio
        CHECK (cantidad_anterior <> cantidad_nueva),
    CONSTRAINT fk_movimiento_inventario_lote
        FOREIGN KEY (id_lote) REFERENCES lote(id_lote) ON DELETE RESTRICT,
    CONSTRAINT fk_movimiento_inventario_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_movimiento_inventario_sucursal
        FOREIGN KEY (id_sucursal) REFERENCES sucursal(id_sucursal) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_lote_fecha
    ON movimiento_inventario (id_lote, fecha_movimiento DESC);

CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_sucursal_fecha
    ON movimiento_inventario (id_sucursal, fecha_movimiento DESC);
