-- Identifica los intentos de venta en efectivo para recuperar el resultado
-- cuando el cliente reintenta una solicitud cuya respuesta se perdio.
ALTER TABLE venta
    ADD COLUMN clave_idempotencia UUID,
    ADD COLUMN huella_idempotencia CHAR(64);

ALTER TABLE venta
    ADD CONSTRAINT chk_venta_idempotencia_efectivo
    CHECK (
        (clave_idempotencia IS NULL AND huella_idempotencia IS NULL)
        OR (
            metodo_pago = 'efectivo'
            AND clave_idempotencia IS NOT NULL
            AND huella_idempotencia IS NOT NULL
        )
    );

CREATE UNIQUE INDEX uq_venta_clave_idempotencia
    ON venta (clave_idempotencia)
    WHERE clave_idempotencia IS NOT NULL;
