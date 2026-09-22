-- Agrega el costo del producto al momento de la venta para calcular rentabilidad.
-- Para detalles existentes se usa el precio de compra actual como valor inicial,
-- porque antes de esta migración no se almacenaba su costo histórico.

BEGIN;

ALTER TABLE detalle_venta
ADD COLUMN costo_unitario NUMERIC(12,2);

UPDATE detalle_venta dv
SET costo_unitario = p.precio_compra
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto
WHERE l.id_lote = dv.id_lote;

ALTER TABLE detalle_venta
ALTER COLUMN costo_unitario SET NOT NULL;

ALTER TABLE detalle_venta
ADD CONSTRAINT ck_detalle_venta_costo_unitario
CHECK (costo_unitario >= 0);

COMMIT;
