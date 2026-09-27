-- Agrega sexo/edad_manual a paciente y crea resultado_laboratorio
-- (resultados en PDF con QR, con URL pública temporal).
-- Es idempotente: puede ejecutarse más de una vez sin duplicar objetos.

BEGIN;

-- =========================
-- paciente: sexo (obligatorio)
-- =========================
ALTER TABLE paciente
    ADD COLUMN IF NOT EXISTS sexo VARCHAR(10);

UPDATE paciente
    SET sexo = 'Otro'
    WHERE sexo IS NULL;

ALTER TABLE paciente
    ALTER COLUMN sexo SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_paciente_sexo'
    ) THEN
        ALTER TABLE paciente
            ADD CONSTRAINT chk_paciente_sexo
            CHECK (sexo IN ('M', 'F', 'Otro'));
    END IF;
END $$;

-- =========================
-- paciente: edad_manual (excluyente con fecha_nacimiento)
-- =========================
ALTER TABLE paciente
    ADD COLUMN IF NOT EXISTS edad_manual INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_paciente_edad_manual_rango'
    ) THEN
        ALTER TABLE paciente
            ADD CONSTRAINT chk_paciente_edad_manual_rango
            CHECK (edad_manual IS NULL OR (edad_manual >= 0 AND edad_manual <= 120));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_paciente_edad_dato'
    ) THEN
        ALTER TABLE paciente
            ADD CONSTRAINT chk_paciente_edad_dato
            CHECK (
                (fecha_nacimiento IS NOT NULL AND edad_manual IS NULL)
                OR
                (fecha_nacimiento IS NULL AND edad_manual IS NOT NULL)
            );
    END IF;
END $$;

-- =========================
-- TABLA: resultado_laboratorio
-- Resultado en PDF (con QR incrustado) asociado al expediente de un paciente.
-- =========================
CREATE TABLE IF NOT EXISTS resultado_laboratorio (
    id_resultado        SERIAL        PRIMARY KEY,
    id_expediente        INTEGER       NOT NULL,
    categoria            VARCHAR(100)  NOT NULL,
    ruta_archivo          VARCHAR(255)  NOT NULL,
    token_publico         UUID          NOT NULL DEFAULT gen_random_uuid(),
    fecha_expiracion      TIMESTAMPTZ   NOT NULL,
    estado                VARCHAR(20)   NOT NULL DEFAULT 'vigente',
    motivo_anulacion      VARCHAR(500),
    fecha_anulacion       TIMESTAMPTZ,
    id_usuario_subida     INTEGER       NOT NULL,
    fecha_subida          TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resultado_expediente
        FOREIGN KEY (id_expediente)
        REFERENCES expediente_laboratorio(id_expediente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_resultado_usuario_subida
        FOREIGN KEY (id_usuario_subida)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT uq_resultado_token
        UNIQUE (token_publico),

    CONSTRAINT chk_resultado_estado
        CHECK (estado IN ('vigente', 'anulado')),

    CONSTRAINT chk_resultado_anulacion
        CHECK (
            (estado = 'vigente' AND fecha_anulacion IS NULL AND motivo_anulacion IS NULL)
            OR
            (estado = 'anulado' AND fecha_anulacion IS NOT NULL AND motivo_anulacion IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_resultado_expediente
    ON resultado_laboratorio (id_expediente, fecha_subida DESC);

COMMIT;
