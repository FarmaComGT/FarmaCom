-- Protege las relaciones históricas de casas farmacéuticas y proveedores.
-- Los registros relacionados se desactivan desde la aplicación; la base evita
-- que una eliminación directa desvincule silenciosamente productos existentes.

ALTER TABLE producto
    DROP CONSTRAINT IF EXISTS fk_producto_proveedor;

ALTER TABLE producto
    ADD CONSTRAINT fk_producto_proveedor
    FOREIGN KEY (id_proveedor)
    REFERENCES proveedor(id_proveedor)
    ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_producto_casa
    ON producto (id_casa);

CREATE INDEX IF NOT EXISTS idx_producto_proveedor
    ON producto (id_proveedor);

CREATE INDEX IF NOT EXISTS idx_lote_proveedor
    ON lote (id_proveedor);
