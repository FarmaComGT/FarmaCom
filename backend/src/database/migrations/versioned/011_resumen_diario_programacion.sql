ALTER TABLE resumen_diario_configuracion
    ADD COLUMN programacion_desde TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE resumen_diario_reporte
    ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT 'manual',
    ADD CONSTRAINT chk_resumen_diario_origen CHECK (origen IN ('manual', 'automatico'));

-- Una segunda hora o un reinicio no producen otro envío automático del mismo día.
CREATE UNIQUE INDEX uq_resumen_diario_automatico
    ON resumen_diario_reporte(id_usuario, fecha) WHERE origen = 'automatico';

ALTER TABLE resumen_diario_envio
    ADD COLUMN proximo_intento_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
