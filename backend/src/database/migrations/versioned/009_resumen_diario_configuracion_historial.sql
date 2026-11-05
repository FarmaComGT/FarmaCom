CREATE TABLE resumen_diario_configuracion (
    id_usuario INTEGER PRIMARY KEY REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    correo_destinatario VARCHAR(254) NOT NULL DEFAULT '',
    hora_envio TIME(0) NOT NULL DEFAULT '20:00',
    automatico BOOLEAN NOT NULL DEFAULT FALSE,
    todas_sucursales BOOLEAN NOT NULL DEFAULT TRUE,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_resumen_diario_correo CHECK (NOT automatico OR LENGTH(TRIM(correo_destinatario)) > 0),
    CONSTRAINT chk_resumen_diario_hora CHECK (EXTRACT(SECOND FROM hora_envio) = 0)
);

CREATE TABLE resumen_diario_sucursal (
    id_usuario INTEGER NOT NULL REFERENCES resumen_diario_configuracion(id_usuario) ON DELETE CASCADE,
    id_sucursal INTEGER NOT NULL REFERENCES sucursal(id_sucursal) ON DELETE RESTRICT,
    PRIMARY KEY (id_usuario, id_sucursal)
);

-- Se conserva solo el corte de datos; el PDF se genera en memoria cuando se solicita.
CREATE TABLE resumen_diario_reporte (
    id_reporte BIGSERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    corte TIMESTAMPTZ NOT NULL,
    estado VARCHAR(40) NOT NULL,
    datos JSONB NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_resumen_diario_estado CHECK (estado IN ('provisional', 'sin_cajas_abiertas_al_corte')),
    CONSTRAINT chk_resumen_diario_datos CHECK (jsonb_typeof(datos) = 'object')
);

CREATE INDEX idx_resumen_diario_reporte_usuario ON resumen_diario_reporte(id_usuario, id_reporte DESC);
