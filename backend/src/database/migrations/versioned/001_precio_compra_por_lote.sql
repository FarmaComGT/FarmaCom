-- SCRUM-295: permite lotes sin vencimiento y consolida el costo de compra
-- en lote. Los costos propios ya registrados por lote tienen prioridad; sólo
-- se completan valores faltantes con el costo anterior del producto.

ALTER TABLE lote
    ADD COLUMN IF NOT EXISTS precio_compra NUMERIC(10,2);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'producto'
          AND column_name = 'precio_compra'
    ) THEN
        EXECUTE $sql$
            UPDATE lote l
            SET precio_compra = p.precio_compra
            FROM producto p
            WHERE p.id_producto = l.id_producto
              AND l.precio_compra IS NULL
        $sql$;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM lote WHERE precio_compra IS NULL) THEN
        RAISE EXCEPTION
            'No se puede completar precio_compra para todos los lotes existentes';
    END IF;
END $$;

ALTER TABLE lote
    ALTER COLUMN precio_compra SET NOT NULL,
    ALTER COLUMN fecha_vencimiento DROP NOT NULL,
    DROP CONSTRAINT IF EXISTS lote_precio_compra_check,
    DROP CONSTRAINT IF EXISTS chk_lote_precio_compra_no_negativo;

ALTER TABLE lote
    ADD CONSTRAINT chk_lote_precio_compra_no_negativo
    CHECK (precio_compra >= 0);

ALTER TABLE producto
    DROP COLUMN IF EXISTS precio_compra;
