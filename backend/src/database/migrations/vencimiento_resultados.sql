-- Permite marcar resultado_laboratorio.estado = 'vencido', asignado
-- automaticamente por el job de purga cuando pasan los 6 meses de vigencia
-- (ver MESES_VIGENCIA en ResultadoLaboratorioService). Reutiliza las columnas
-- motivo_anulacion/fecha_anulacion igual que 'anulado'.
-- Es idempotente: puede ejecutarse mas de una vez sin duplicar objetos.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultado_estado'
    ) THEN
        ALTER TABLE resultado_laboratorio DROP CONSTRAINT chk_resultado_estado;
    END IF;

    ALTER TABLE resultado_laboratorio
        ADD CONSTRAINT chk_resultado_estado
        CHECK (estado IN ('vigente', 'anulado', 'vencido'));

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultado_anulacion'
    ) THEN
        ALTER TABLE resultado_laboratorio DROP CONSTRAINT chk_resultado_anulacion;
    END IF;

    ALTER TABLE resultado_laboratorio
        ADD CONSTRAINT chk_resultado_anulacion
        CHECK (
            (estado = 'vigente' AND fecha_anulacion IS NULL AND motivo_anulacion IS NULL)
            OR
            (estado IN ('anulado', 'vencido') AND fecha_anulacion IS NOT NULL AND motivo_anulacion IS NOT NULL)
        );
END $$;

COMMIT;
