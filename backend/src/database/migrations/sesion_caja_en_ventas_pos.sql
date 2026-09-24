-- Vincula los pagos POS pendientes con la sesión de caja que originó la venta.

BEGIN;

ALTER TABLE pago_pos
ADD COLUMN id_sesion_caja INTEGER;

ALTER TABLE pago_pos
ADD CONSTRAINT fk_pago_pos_sesion_caja
FOREIGN KEY (id_sesion_caja)
REFERENCES sesion_caja(id_sesion_caja)
ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_pago_pos_sesion_estado
ON pago_pos (id_sesion_caja, estado);

-- Las órdenes históricas ya finalizadas no pueden asociarse de forma confiable.
-- La aplicación exige este valor para todas las órdenes nuevas.

COMMIT;
