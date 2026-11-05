CREATE TABLE resumen_diario_envio (
    id_envio BIGSERIAL PRIMARY KEY,
    id_reporte BIGINT NOT NULL REFERENCES resumen_diario_reporte(id_reporte) ON DELETE RESTRICT,
    canal VARCHAR(20) NOT NULL DEFAULT 'correo',
    destinatario VARCHAR(254) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    intentos INTEGER NOT NULL DEFAULT 0,
    solicitado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    iniciado_en TIMESTAMPTZ,
    finalizado_en TIMESTAMPTZ,
    mensaje_id VARCHAR(254),
    error VARCHAR(300),
    CONSTRAINT uq_resumen_diario_envio UNIQUE (id_reporte, canal),
    CONSTRAINT chk_resumen_diario_envio_canal CHECK (canal = 'correo'),
    CONSTRAINT chk_resumen_diario_envio_estado CHECK (estado IN ('pendiente', 'procesando', 'aceptado', 'fallido', 'incierto')),
    CONSTRAINT chk_resumen_diario_envio_intentos CHECK (intentos >= 0)
);
CREATE INDEX idx_resumen_diario_envio_pendiente ON resumen_diario_envio(id_envio) WHERE estado = 'pendiente';
