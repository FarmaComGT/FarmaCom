-- Auditoria durable de productos y lotes. Los identificadores de las
-- entidades no son llaves foraneas a proposito: una eliminacion permitida
-- debe conservar el rastro y seguir siendo filtrable.
CREATE TABLE IF NOT EXISTS bitacora_inventario (
    id_bitacora         BIGSERIAL     PRIMARY KEY,
    entidad             VARCHAR(20)   NOT NULL,
    id_entidad          INTEGER       NOT NULL,
    accion              VARCHAR(30)   NOT NULL,
    id_producto         INTEGER,
    id_lote             INTEGER,
    id_sucursal         INTEGER,
    id_usuario          INTEGER       NOT NULL,
    valores_anteriores  JSONB,
    valores_nuevos      JSONB,
    fecha_hora          TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_bitacora_inventario_entidad
        CHECK (entidad IN ('producto', 'lote')),
    CONSTRAINT chk_bitacora_inventario_accion
        CHECK (accion IN ('alta', 'modificacion', 'cambio_estado', 'eliminacion')),
    CONSTRAINT fk_bitacora_inventario_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_bitacora_inventario_fecha
    ON bitacora_inventario (fecha_hora DESC, id_bitacora DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_inventario_producto_fecha
    ON bitacora_inventario (id_producto, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_inventario_lote_fecha
    ON bitacora_inventario (id_lote, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_inventario_sucursal_fecha
    ON bitacora_inventario (id_sucursal, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_inventario_usuario_fecha
    ON bitacora_inventario (id_usuario, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_inventario_accion_fecha
    ON bitacora_inventario (accion, fecha_hora DESC);

CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_tipo_fecha
    ON movimiento_inventario (tipo, fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_usuario_fecha
    ON movimiento_inventario (id_usuario, fecha_movimiento DESC);
