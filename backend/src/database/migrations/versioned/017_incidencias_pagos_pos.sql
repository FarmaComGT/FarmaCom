-- SCRUM-389: conservar cobros confirmados cuya venta local no pudo completarse.

ALTER TABLE pago_pos
    DROP CONSTRAINT IF EXISTS chk_pago_pos_estado;

ALTER TABLE pago_pos
    ADD CONSTRAINT chk_pago_pos_estado
        CHECK (estado IN (
            'pendiente',
            'procesando',
            'pagado',
            'fallido',
            'cancelado',
            'rechazado',
            'incidencia'
        ));

ALTER TABLE pago_pos
    ADD COLUMN IF NOT EXISTS codigo_incidencia VARCHAR(50),
    ADD COLUMN IF NOT EXISTS detalle_incidencia VARCHAR(500),
    ADD COLUMN IF NOT EXISTS incidencia_en TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS conciliado_en TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS id_usuario_conciliacion INTEGER;

ALTER TABLE pago_pos
    DROP CONSTRAINT IF EXISTS fk_pago_pos_usuario_conciliacion;

ALTER TABLE pago_pos
    ADD CONSTRAINT fk_pago_pos_usuario_conciliacion
        FOREIGN KEY (id_usuario_conciliacion)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_pago_pos_incidencias
    ON pago_pos (id_sucursal, incidencia_en DESC)
    WHERE estado = 'incidencia';
