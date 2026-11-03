-- Recupera instalaciones existentes donde la migración histórica de la
-- persona que anuló una venta no se ejecutó. La columna es opcional porque
-- las ventas anteriores no necesariamente tienen ese dato.

ALTER TABLE venta
    ADD COLUMN IF NOT EXISTS id_usuario_anulacion INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_venta_usuario_anulacion'
          AND conrelid = 'venta'::regclass
    ) THEN
        ALTER TABLE venta
            ADD CONSTRAINT fk_venta_usuario_anulacion
            FOREIGN KEY (id_usuario_anulacion)
            REFERENCES usuario(id_usuario)
            ON DELETE RESTRICT;
    END IF;
END $$;
