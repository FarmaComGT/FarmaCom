-- El código comercial es opcional y conserva ceros iniciales.
ALTER TABLE producto ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(64);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'producto'::regclass AND conname = 'chk_producto_codigo_barras'
  ) THEN
    ALTER TABLE producto ADD CONSTRAINT chk_producto_codigo_barras
      CHECK (codigo_barras IS NULL OR codigo_barras ~ '^[!-~]{1,64}$');
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_producto_codigo_barras
  ON producto (codigo_barras) WHERE codigo_barras IS NOT NULL;
