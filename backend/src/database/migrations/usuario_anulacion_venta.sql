-- Registra al usuario que ejecuta la anulacion de una venta.

BEGIN;

ALTER TABLE venta
    ADD COLUMN id_usuario_anulacion INTEGER;

ALTER TABLE venta
    ADD CONSTRAINT fk_venta_usuario_anulacion
    FOREIGN KEY (id_usuario_anulacion)
    REFERENCES usuario(id_usuario)
    ON DELETE RESTRICT;

COMMIT;
