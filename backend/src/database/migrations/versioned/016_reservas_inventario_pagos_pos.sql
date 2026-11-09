-- Separa existencias fisicas de unidades temporalmente comprometidas por un
-- pago POS pendiente.
ALTER TABLE lote
    ADD COLUMN stock_reservado INTEGER NOT NULL DEFAULT 0;

ALTER TABLE lote
    ADD CONSTRAINT chk_lote_stock_reservado
    CHECK (stock_reservado >= 0 AND stock_reservado <= stock_actual);

CREATE TABLE reserva_inventario_pago (
    id_reserva       BIGSERIAL PRIMARY KEY,
    id_pago_pos      INTEGER NOT NULL,
    id_lote          INTEGER NOT NULL,
    cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
    estado           VARCHAR(20) NOT NULL DEFAULT 'reservada',
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_reserva_pago_lote UNIQUE (id_pago_pos, id_lote),
    CONSTRAINT chk_reserva_inventario_estado
        CHECK (estado IN ('reservada', 'consumida', 'liberada')),
    CONSTRAINT fk_reserva_inventario_pago
        FOREIGN KEY (id_pago_pos) REFERENCES pago_pos(id_pago_pos) ON DELETE RESTRICT,
    CONSTRAINT fk_reserva_inventario_lote
        FOREIGN KEY (id_lote) REFERENCES lote(id_lote) ON DELETE RESTRICT
);

CREATE INDEX idx_reserva_inventario_pago_estado
    ON reserva_inventario_pago (id_pago_pos, estado);

-- PostgreSQL fija la expansion de l.* al crear una vista. Se recrea para
-- exponer stock_reservado y calcular el estado con unidades disponibles.
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
        WHEN (l.stock_actual - l.stock_reservado) = 0
            THEN 'agotado'
        WHEN (l.stock_actual - l.stock_reservado) <= p.stock_minimo
            THEN 'poco_stock'
        ELSE 'normal'
    END AS estado_stock
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto;
