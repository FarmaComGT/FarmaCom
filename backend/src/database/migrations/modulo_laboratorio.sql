-- =========================
-- Módulo de laboratorio: laboratorio, rol laboratorista,
-- paciente, expediente, visitas y bitácora de cambios.
-- =========================

BEGIN;

CREATE TABLE laboratorio (
    id_laboratorio      SERIAL PRIMARY KEY,
    id_ciudad            INTEGER      NOT NULL,
    nombre_laboratorio   VARCHAR(100) NOT NULL UNIQUE,
    direccion            TEXT         NOT NULL,
    activo               BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_laboratorio_ciudad
        FOREIGN KEY (id_ciudad)
        REFERENCES ciudad(id_ciudad)
        ON DELETE RESTRICT
);

ALTER TABLE usuario
    ADD COLUMN id_laboratorio INTEGER;

ALTER TABLE usuario
    ADD CONSTRAINT fk_usuario_laboratorio
        FOREIGN KEY (id_laboratorio)
        REFERENCES laboratorio(id_laboratorio)
        ON DELETE RESTRICT;

ALTER TABLE usuario
    DROP CONSTRAINT IF EXISTS usuario_rol_check;

ALTER TABLE usuario
    ADD CONSTRAINT usuario_rol_check
        CHECK (rol IN ('dueno', 'administrador', 'dependiente', 'laboratorista'));

ALTER TABLE usuario
    ADD CONSTRAINT chk_usuario_laboratorista
        CHECK (
            (rol = 'laboratorista' AND id_laboratorio IS NOT NULL)
            OR
            (rol != 'laboratorista' AND id_laboratorio IS NULL)
        );

CREATE TABLE paciente (
    id_paciente        SERIAL        PRIMARY KEY,
    id_laboratorio     INTEGER       NOT NULL,
    nombre_paciente    VARCHAR(150)  NOT NULL,
    dpi                VARCHAR(20),
    fecha_nacimiento   DATE,
    telefono           VARCHAR(20),
    direccion          TEXT,
    observaciones      TEXT,
    estado             VARCHAR(20)   NOT NULL DEFAULT 'activo',
    motivo_anulacion   VARCHAR(500),
    fecha_anulacion    TIMESTAMPTZ,
    fecha_registro     TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paciente_laboratorio
        FOREIGN KEY (id_laboratorio)
        REFERENCES laboratorio(id_laboratorio)
        ON DELETE RESTRICT,

    CONSTRAINT chk_paciente_estado
        CHECK (estado IN ('activo', 'anulado')),

    CONSTRAINT chk_paciente_anulacion
        CHECK (
            (estado = 'activo' AND fecha_anulacion IS NULL AND motivo_anulacion IS NULL)
            OR
            (estado = 'anulado' AND fecha_anulacion IS NOT NULL AND motivo_anulacion IS NOT NULL)
        )
);

CREATE UNIQUE INDEX uq_paciente_dpi
    ON paciente (dpi)
    WHERE dpi IS NOT NULL;

CREATE INDEX idx_paciente_laboratorio
    ON paciente (id_laboratorio, estado);

CREATE INDEX idx_paciente_nombre
    ON paciente (LOWER(nombre_paciente));

CREATE TABLE expediente_laboratorio (
    id_expediente    SERIAL        PRIMARY KEY,
    id_paciente      INTEGER       NOT NULL UNIQUE,
    antecedentes     TEXT,
    fecha_creacion   TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expediente_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES paciente(id_paciente)
        ON DELETE CASCADE
);

CREATE TABLE visita_laboratorio (
    id_visita         SERIAL        PRIMARY KEY,
    id_expediente     INTEGER       NOT NULL,
    id_usuario        INTEGER       NOT NULL,
    motivo_visita     VARCHAR(255)  NOT NULL,
    notas             TEXT,
    fecha_visita      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado            VARCHAR(20)   NOT NULL DEFAULT 'activa',
    motivo_anulacion  VARCHAR(500),
    fecha_anulacion   TIMESTAMPTZ,

    CONSTRAINT fk_visita_expediente
        FOREIGN KEY (id_expediente)
        REFERENCES expediente_laboratorio(id_expediente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_visita_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT chk_visita_estado
        CHECK (estado IN ('activa', 'anulada')),

    CONSTRAINT chk_visita_anulacion
        CHECK (
            (estado = 'activa' AND fecha_anulacion IS NULL AND motivo_anulacion IS NULL)
            OR
            (estado = 'anulada' AND fecha_anulacion IS NOT NULL AND motivo_anulacion IS NOT NULL)
        )
);

CREATE INDEX idx_visita_expediente
    ON visita_laboratorio (id_expediente, fecha_visita DESC);

CREATE TABLE bitacora_laboratorio (
    id_bitacora          SERIAL        PRIMARY KEY,
    id_usuario           INTEGER       NOT NULL,
    entidad              VARCHAR(50)   NOT NULL,
    id_entidad           INTEGER       NOT NULL,
    accion               VARCHAR(50)   NOT NULL,
    valores_anteriores   JSONB,
    valores_nuevos       JSONB,
    fecha_hora           TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bitacora_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT
);

CREATE INDEX idx_bitacora_entidad
    ON bitacora_laboratorio (entidad, id_entidad, fecha_hora DESC);

-- Laboratorio y usuario laboratorista mínimos para poder operar el módulo.
INSERT INTO laboratorio (id_ciudad, nombre_laboratorio, direccion)
SELECT c.id_ciudad, 'Laboratorio Central', 'Zona 1, Ciudad de Guatemala'
FROM ciudad c
WHERE c.nombre_ciudad = 'Guatemala'
ON CONFLICT (nombre_laboratorio) DO NOTHING;

INSERT INTO usuario (id_sucursal, id_laboratorio, nombre_usuario, correo_usuario, contrasena_hash, rol)
SELECT
    s.id_sucursal,
    l.id_laboratorio,
    'Laboratorista General',
    'laboratorista@farma.com',
    crypt('123456', gen_salt('bf')),
    'laboratorista'
FROM sucursal s
JOIN laboratorio l ON l.nombre_laboratorio = 'Laboratorio Central'
WHERE s.nombre_sucursal = 'Sucursal Central'
  AND NOT EXISTS (
      SELECT 1
      FROM usuario u
      WHERE u.correo_usuario = 'laboratorista@farma.com'
  );

COMMIT;
