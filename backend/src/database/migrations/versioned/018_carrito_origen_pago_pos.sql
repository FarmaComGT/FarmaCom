-- SCRUM-393: vincular cada intento POS con el carrito que lo originó.

ALTER TABLE pago_pos
    ADD COLUMN IF NOT EXISTS carrito_origen_id VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_pago_pos_carrito_origen
    ON pago_pos (id_usuario, id_sucursal, carrito_origen_id)
    WHERE carrito_origen_id IS NOT NULL;
