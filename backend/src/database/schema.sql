-- =========================
-- TABLA: ciudad
-- =========================
CREATE TABLE IF NOT EXISTS ciudad (
    id_ciudad SERIAL PRIMARY KEY,
    nombre_ciudad VARCHAR(100) NOT NULL UNIQUE
);

-- =========================
-- TABLA: sucursal
-- =========================
CREATE TABLE IF NOT EXISTS sucursal (
    id_sucursal SERIAL PRIMARY KEY,
    id_ciudad INTEGER NOT NULL,
    nombre_sucursal VARCHAR(100) NOT NULL UNIQUE,
    direccion TEXT NOT NULL,

    CONSTRAINT fk_sucursal_ciudad
        FOREIGN KEY (id_ciudad)
        REFERENCES ciudad(id_ciudad)
        ON DELETE RESTRICT
);

-- =========================
-- TABLA: telefono_sucursal
-- =========================
CREATE TABLE IF NOT EXISTS telefono_sucursal (
    id_telefono_sucursal SERIAL PRIMARY KEY,
    id_sucursal INTEGER NOT NULL,
    numero VARCHAR(20) NOT NULL,

    CONSTRAINT fk_telefono_sucursal
        FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal)
        ON DELETE CASCADE
);

-- =========================
-- TABLA: correo_sucursal
-- =========================
CREATE TABLE IF NOT EXISTS correo_sucursal (
    id_correo_sucursal SERIAL PRIMARY KEY,
    id_sucursal INTEGER NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,

    CONSTRAINT fk_correo_sucursal
        FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal)
        ON DELETE CASCADE
);

-- =========================
-- TABLA: usuario
-- =========================
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    id_sucursal INTEGER NOT NULL,
    nombre_usuario VARCHAR(100) NOT NULL,
    correo_usuario VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash TEXT NOT NULL,
    token_version INTEGER NOT NULL DEFAULT 0,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('dueno', 'administrador', 'dependiente')),
    estado_usuario VARCHAR(20) DEFAULT 'activo' CHECK (estado_usuario IN ('activo', 'inactivo')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_sucursal
        FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal)
        ON DELETE CASCADE
);

-- =========================
-- TABLA: cliente
-- =========================
CREATE TABLE IF NOT EXISTS cliente (
    id_cliente SERIAL PRIMARY KEY,
    nombre_cliente VARCHAR(150) NOT NULL,
    nit VARCHAR(20),
    observaciones TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_nit
    ON cliente (nit)
    WHERE nit IS NOT NULL;

-- =========================
-- TABLA: categoria
-- =========================
CREATE TABLE IF NOT EXISTS categoria (
    id_categoria     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- =========================
-- TABLA: casa_farmaceutica
-- =========================
CREATE TABLE IF NOT EXISTS casa_farmaceutica (
    id_casa  SERIAL PRIMARY KEY,
    nombre   VARCHAR(150) NOT NULL UNIQUE,
    activo   BOOLEAN      NOT NULL DEFAULT TRUE
);

-- =========================
-- TABLA: casa_telefono
-- =========================
CREATE TABLE IF NOT EXISTS casa_telefono (
    id_telefono SERIAL PRIMARY KEY,
    id_casa     INTEGER     NOT NULL,
    numero      VARCHAR(20) NOT NULL,

    CONSTRAINT fk_casa_telefono_casa
        FOREIGN KEY (id_casa)
        REFERENCES casa_farmaceutica(id_casa)
        ON DELETE CASCADE
);

-- =========================
-- TABLA: casa_email
-- =========================
CREATE TABLE IF NOT EXISTS casa_email (
    id_email SERIAL PRIMARY KEY,
    id_casa  INTEGER      NOT NULL,
    correo   VARCHAR(150) NOT NULL UNIQUE,

    CONSTRAINT fk_casa_email_casa
        FOREIGN KEY (id_casa)
        REFERENCES casa_farmaceutica(id_casa)
        ON DELETE CASCADE
);

-- =========================
-- TABLA: proveedor
-- =========================
CREATE TABLE IF NOT EXISTS proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre       VARCHAR(150) NOT NULL UNIQUE,
    activo       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- =========================
-- TABLA: proveedor_telefono
-- =========================
CREATE TABLE IF NOT EXISTS proveedor_telefono (
    id_telefono  SERIAL PRIMARY KEY,
    id_proveedor INTEGER     NOT NULL,
    numero       VARCHAR(20) NOT NULL,

    CONSTRAINT fk_proveedor_telefono_proveedor
        FOREIGN KEY (id_proveedor)
        REFERENCES proveedor(id_proveedor)
        ON DELETE CASCADE
);

-- =========================
-- TABLA: proveedor_email
-- =========================
CREATE TABLE IF NOT EXISTS proveedor_email (
    id_email     SERIAL PRIMARY KEY,
    id_proveedor INTEGER      NOT NULL,
    correo       VARCHAR(150) NOT NULL UNIQUE,

    CONSTRAINT fk_proveedor_email_proveedor
        FOREIGN KEY (id_proveedor)
        REFERENCES proveedor(id_proveedor)
        ON DELETE CASCADE
);

-- =========================
-- TABLA: presentacion
-- =========================
CREATE TABLE IF NOT EXISTS presentacion (
    id_presentacion SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO presentacion (nombre)
VALUES ('Caja'), ('Blíster'), ('Unidad')
ON CONFLICT (nombre) DO NOTHING;

-- =========================
-- TABLA: producto
-- =========================
CREATE TABLE IF NOT EXISTS producto (
    id_producto              SERIAL PRIMARY KEY,
    codigo                   VARCHAR(50)   NOT NULL UNIQUE,
    nombre_comercial         VARCHAR(150)  NOT NULL,
    nombre_generico          VARCHAR(150),
    concentracion            VARCHAR(50),
    id_presentacion          INTEGER       NOT NULL,
    descripcion              TEXT,
    id_categoria             INTEGER       NOT NULL,
    id_casa                  INTEGER       NOT NULL,
    id_proveedor             INTEGER,
    precio_compra            NUMERIC(10,2) NOT NULL CHECK (precio_compra >= 0),
    stock_minimo             INTEGER       NOT NULL DEFAULT 5,
    meses_alerta_vencimiento INTEGER       NOT NULL,
    aplica_mayoreo           BOOLEAN       NOT NULL DEFAULT FALSE,
    activo                   BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_creacion           TIMESTAMP     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_producto_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categoria(id_categoria)
        ON DELETE RESTRICT,

    CONSTRAINT fk_producto_casa
        FOREIGN KEY (id_casa)
        REFERENCES casa_farmaceutica(id_casa)
        ON DELETE RESTRICT,

    CONSTRAINT fk_producto_proveedor
        FOREIGN KEY (id_proveedor)
        REFERENCES proveedor(id_proveedor)
        ON DELETE SET NULL,

    CONSTRAINT fk_producto_presentacion
        FOREIGN KEY (id_presentacion)
        REFERENCES presentacion(id_presentacion)
        ON DELETE RESTRICT
);

-- =========================
-- ÍNDICES: producto
-- =========================
CREATE UNIQUE INDEX IF NOT EXISTS uq_producto_identidad
    ON producto (
        LOWER(TRIM(nombre_generico)),
        COALESCE(LOWER(TRIM(concentracion)), ''),
        id_casa,
        id_presentacion
    );

-- Agrupación de familia para los reportes comparativos por presentación.
CREATE INDEX IF NOT EXISTS idx_producto_familia
    ON producto (
        LOWER(TRIM(nombre_generico)),
        COALESCE(LOWER(TRIM(concentracion)), ''),
        id_casa
    );

-- =========================
-- TABLA: promocion
-- =========================
CREATE TABLE IF NOT EXISTS promocion (
    id_promocion     SERIAL PRIMARY KEY,
    id_producto      INTEGER       NOT NULL,
    id_sucursal      INTEGER       NOT NULL,
    cantidad_minima  INTEGER       NOT NULL,
    precio_promocion NUMERIC(10,2) NOT NULL,
    fecha_inicio     DATE          NOT NULL,
    fecha_fin        DATE          NOT NULL,
    activo           BOOLEAN       NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_promocion_producto
        FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto)
        ON DELETE CASCADE,

    CONSTRAINT fk_promocion_sucursal
        FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal)
        ON DELETE CASCADE
);

-- =========================
-- TABLA: casa_proveedor (cruce)
-- =========================
CREATE TABLE IF NOT EXISTS casa_proveedor (
    id_casa      INTEGER NOT NULL,
    id_proveedor INTEGER NOT NULL,

    PRIMARY KEY (id_casa, id_proveedor),

    CONSTRAINT fk_casa_proveedor_casa
        FOREIGN KEY (id_casa)
        REFERENCES casa_farmaceutica(id_casa)
        ON DELETE CASCADE,

    CONSTRAINT fk_casa_proveedor_proveedor
        FOREIGN KEY (id_proveedor)
        REFERENCES proveedor(id_proveedor)
        ON DELETE CASCADE
);
 
-- =========================
-- TABLA: lote
-- =========================
CREATE TABLE IF NOT EXISTS lote (
    id_lote               SERIAL        PRIMARY KEY,
    id_producto           INTEGER       NOT NULL,
    id_proveedor          INTEGER       NOT NULL,
    id_sucursal           INTEGER       NOT NULL,
    numero_lote           VARCHAR(100)  NOT NULL,
    fecha_vencimiento     DATE          NOT NULL,
    cantidad_ingresada    INTEGER       NOT NULL CHECK (cantidad_ingresada > 0),
    stock_actual          INTEGER       NOT NULL CHECK (stock_actual >= 0),
    precio_venta          NUMERIC(10,2) NOT NULL CHECK (precio_venta >= 0),
    margen_ganancia       NUMERIC(8,4)  NOT NULL CHECK (margen_ganancia >= 0),
    precio_mayoreo        NUMERIC(10,2)          CHECK (precio_mayoreo >= 0),
    cantidad_mayoreo      INTEGER                CHECK (cantidad_mayoreo > 0),

    CONSTRAINT fk_lote_producto
        FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lote_proveedor
        FOREIGN KEY (id_proveedor)
        REFERENCES proveedor(id_proveedor)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lote_sucursal
        FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal)
        ON DELETE RESTRICT,

        -- precio_mayoreo y cantidad_mayoreo se definen juntos o ninguno.
    CONSTRAINT chk_lote_mayoreo_completo
        CHECK (
            (precio_mayoreo IS NULL AND cantidad_mayoreo IS NULL)
            OR
            (precio_mayoreo IS NOT NULL AND cantidad_mayoreo IS NOT NULL)
        ),

    -- Un número de lote debe ser único por producto y sucursal
    CONSTRAINT uq_lote_numero_producto_sucursal
        UNIQUE (numero_lote, id_producto, id_sucursal)
);

-- =========================
-- TABLA: caja
-- Una sucursal puede operar varias cajas físicas.
-- =========================
CREATE TABLE IF NOT EXISTS caja (
    id_caja       SERIAL        PRIMARY KEY,
    id_sucursal   INTEGER       NOT NULL,
    nombre        VARCHAR(100)  NOT NULL,
    activa        BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_caja_sucursal
        FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_caja_sucursal_nombre
    ON caja (id_sucursal, LOWER(nombre));

-- =========================
-- TABLA: sesion_caja
-- Representa la apertura y el cierre de un turno de una caja.
-- Los totales permanecen NULL mientras la sesión está abierta y
-- se guardan como una fotografía inmutable al cerrarla.
-- =========================
CREATE TABLE IF NOT EXISTS sesion_caja (
    id_sesion_caja          SERIAL         PRIMARY KEY,
    id_caja                 INTEGER        NOT NULL,
    id_usuario_apertura     INTEGER        NOT NULL,
    id_usuario_cierre       INTEGER,
    fecha_operacion         DATE           NOT NULL
        DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::DATE),
    turno                   VARCHAR(20)    NOT NULL,
    fecha_hora_apertura     TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_hora_cierre       TIMESTAMPTZ,
    fondo_inicial           NUMERIC(14,2)  NOT NULL CHECK (fondo_inicial >= 0),
    total_ventas_efectivo   NUMERIC(14,2)  CHECK (total_ventas_efectivo >= 0),
    total_ventas_tarjeta    NUMERIC(14,2)  CHECK (total_ventas_tarjeta >= 0),
    total_entradas          NUMERIC(14,2)  CHECK (total_entradas >= 0),
    total_salidas           NUMERIC(14,2)  CHECK (total_salidas >= 0),
    efectivo_esperado       NUMERIC(14,2)  CHECK (efectivo_esperado >= 0),
    efectivo_contado        NUMERIC(14,2)  CHECK (efectivo_contado >= 0),
    diferencia_efectivo     NUMERIC(14,2),
    cantidad_ventas         INTEGER        CHECK (cantidad_ventas >= 0),
    cantidad_anulaciones    INTEGER        CHECK (cantidad_anulaciones >= 0),
    estado                  VARCHAR(20)    NOT NULL DEFAULT 'abierta',
    observaciones           VARCHAR(500),

    CONSTRAINT chk_sesion_caja_turno
        CHECK (turno IN ('mañana', 'tarde', 'noche')),
    CONSTRAINT chk_sesion_caja_estado
        CHECK (estado IN ('abierta', 'cerrada')),
    CONSTRAINT chk_sesion_caja_fechas
        CHECK (
            fecha_hora_cierre IS NULL
            OR fecha_hora_cierre > fecha_hora_apertura
        ),
    CONSTRAINT chk_sesion_caja_cierre
        CHECK (
            (
                estado = 'abierta'
                AND id_usuario_cierre IS NULL
                AND fecha_hora_cierre IS NULL
                AND total_ventas_efectivo IS NULL
                AND total_ventas_tarjeta IS NULL
                AND total_entradas IS NULL
                AND total_salidas IS NULL
                AND efectivo_esperado IS NULL
                AND efectivo_contado IS NULL
                AND diferencia_efectivo IS NULL
                AND cantidad_ventas IS NULL
                AND cantidad_anulaciones IS NULL
            )
            OR
            (
                estado = 'cerrada'
                AND id_usuario_cierre IS NOT NULL
                AND fecha_hora_cierre IS NOT NULL
                AND total_ventas_efectivo IS NOT NULL
                AND total_ventas_tarjeta IS NOT NULL
                AND total_entradas IS NOT NULL
                AND total_salidas IS NOT NULL
                AND efectivo_esperado IS NOT NULL
                AND efectivo_contado IS NOT NULL
                AND diferencia_efectivo IS NOT NULL
                AND cantidad_ventas IS NOT NULL
                AND cantidad_anulaciones IS NOT NULL
            )
        ),
    CONSTRAINT fk_sesion_caja_caja
        FOREIGN KEY (id_caja)
        REFERENCES caja(id_caja)
        ON DELETE RESTRICT,
    CONSTRAINT fk_sesion_caja_usuario_apertura
        FOREIGN KEY (id_usuario_apertura)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,
    CONSTRAINT fk_sesion_caja_usuario_cierre
        FOREIGN KEY (id_usuario_cierre)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sesion_caja_abierta
    ON sesion_caja (id_caja)
    WHERE estado = 'abierta';

CREATE INDEX IF NOT EXISTS idx_sesion_caja_fecha_operacion
    ON sesion_caja (fecha_operacion DESC, id_caja);

-- =========================
-- TABLA: movimiento_caja
-- Entradas y salidas extraordinarias de efectivo durante una sesión.
-- =========================
CREATE TABLE IF NOT EXISTS movimiento_caja (
    id_movimiento_caja  SERIAL         PRIMARY KEY,
    id_sesion_caja      INTEGER        NOT NULL,
    id_usuario          INTEGER        NOT NULL,
    tipo                VARCHAR(20)    NOT NULL,
    monto               NUMERIC(14,2)  NOT NULL CHECK (monto > 0),
    motivo              VARCHAR(500)   NOT NULL,
    fecha_hora           TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_movimiento_caja_tipo
        CHECK (tipo IN ('entrada', 'salida')),
    CONSTRAINT fk_movimiento_caja_sesion
        FOREIGN KEY (id_sesion_caja)
        REFERENCES sesion_caja(id_sesion_caja)
        ON DELETE RESTRICT,
    CONSTRAINT fk_movimiento_caja_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_movimiento_caja_sesion_fecha
    ON movimiento_caja (id_sesion_caja, fecha_hora);

-- =========================
-- TABLA: venta
-- =========================
CREATE TABLE IF NOT EXISTS venta (
    id_venta          SERIAL         PRIMARY KEY,
    id_sucursal       INTEGER        NOT NULL,
    id_usuario        INTEGER        NOT NULL,
    id_sesion_caja    INTEGER,
    id_cliente        INTEGER,
    metodo_pago       VARCHAR(20)    NOT NULL DEFAULT 'efectivo',
    proveedor_pago    VARCHAR(30),
    referencia_pago   VARCHAR(120),
    estado_pago       VARCHAR(30),
    autorizacion_pago VARCHAR(120),
    tarjeta_ultimos4  CHAR(4),
    total             NUMERIC(12,2)  NOT NULL CHECK (total > 0),
    monto_recibido    NUMERIC(12,2)  NOT NULL CHECK (monto_recibido >= total),
    cambio            NUMERIC(12,2)  NOT NULL CHECK (cambio = monto_recibido - total),
    estado            VARCHAR(20)    NOT NULL DEFAULT 'completada',
    fecha_venta       TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_anulacion   TIMESTAMPTZ,
    motivo_anulacion  VARCHAR(500),

    CONSTRAINT chk_venta_metodo_pago
        CHECK (metodo_pago IN ('efectivo', 'tarjeta')),

    CONSTRAINT chk_venta_pago_tarjeta
        CHECK (
            (
                metodo_pago = 'efectivo'
                AND proveedor_pago IS NULL
                AND referencia_pago IS NULL
                AND estado_pago IS NULL
                AND autorizacion_pago IS NULL
                AND tarjeta_ultimos4 IS NULL
            )
            OR
            (
                metodo_pago = 'tarjeta'
                AND proveedor_pago IS NOT NULL
                AND referencia_pago IS NOT NULL
                AND estado_pago = 'pagado'
                AND monto_recibido = total
                AND cambio = 0
            )
        ),

    CONSTRAINT chk_venta_estado
        CHECK (estado IN ('completada', 'anulada')),

    CONSTRAINT chk_venta_anulacion
        CHECK (
            (estado = 'completada' AND fecha_anulacion IS NULL)
            OR
            (estado = 'anulada' AND fecha_anulacion IS NOT NULL)
        ),

    CONSTRAINT fk_venta_sucursal
        FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal)
        ON DELETE RESTRICT,

    CONSTRAINT fk_venta_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,

    CONSTRAINT fk_venta_sesion_caja
        FOREIGN KEY (id_sesion_caja)
        REFERENCES sesion_caja(id_sesion_caja)
        ON DELETE RESTRICT,

    -- Una venta puede quedar como consumidor final. Si el cliente se elimina,
    -- se conserva el registro financiero y se desasocia únicamente al cliente.
    CONSTRAINT fk_venta_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente)
        ON DELETE SET NULL
);

-- =========================
-- TABLA: pago_pos
-- Orden temporal para cobros asincronos enviados a una terminal Recurrente.
-- La venta definitiva se crea unicamente al recibir el webhook exitoso.
-- =========================
CREATE TABLE IF NOT EXISTS pago_pos (
    id_pago_pos           SERIAL PRIMARY KEY,
    external_id           VARCHAR(120) NOT NULL UNIQUE,
    id_sucursal           INTEGER NOT NULL,
    id_usuario            INTEGER NOT NULL,
    id_cliente            INTEGER,
    terminal_id           VARCHAR(120) NOT NULL,
    total                 NUMERIC(12,2) NOT NULL CHECK (total > 0),
    detalles              JSONB NOT NULL CHECK (jsonb_typeof(detalles) = 'array'),
    comando_recurrente_id VARCHAR(120),
    evento_recurrente_id  VARCHAR(120) UNIQUE,
    referencia_pago       VARCHAR(120),
    estado_pago           VARCHAR(30),
    autorizacion_pago     VARCHAR(120),
    tarjeta_ultimos4      CHAR(4),
    estado                VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    id_venta              INTEGER UNIQUE,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_pago_pos_estado
        CHECK (estado IN ('pendiente', 'procesando', 'pagado', 'fallido', 'cancelado', 'rechazado')),
    CONSTRAINT fk_pago_pos_sucursal
        FOREIGN KEY (id_sucursal)
        REFERENCES sucursal(id_sucursal)
        ON DELETE RESTRICT,
    CONSTRAINT fk_pago_pos_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,
    CONSTRAINT fk_pago_pos_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_cliente)
        ON DELETE SET NULL,
    CONSTRAINT fk_pago_pos_venta
        FOREIGN KEY (id_venta)
        REFERENCES venta(id_venta)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pago_pos_estado
    ON pago_pos (estado, creado_en DESC);

-- =========================
-- TABLA: detalle_venta
-- =========================
CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle_venta  SERIAL         PRIMARY KEY,
    id_venta          INTEGER        NOT NULL,
    id_lote           INTEGER        NOT NULL,
    cantidad          INTEGER        NOT NULL CHECK (cantidad > 0),
    precio_unitario   NUMERIC(12,2)  NOT NULL CHECK (precio_unitario >= 0),
    costo_unitario    NUMERIC(12,2)  NOT NULL CHECK (costo_unitario >= 0),
    subtotal          NUMERIC(12,2)  GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,

    CONSTRAINT fk_detalle_venta
        FOREIGN KEY (id_venta)
        REFERENCES venta(id_venta)
        ON DELETE RESTRICT,

    CONSTRAINT fk_detalle_venta_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote)
        ON DELETE RESTRICT,

    CONSTRAINT uq_detalle_venta_lote
        UNIQUE (id_venta, id_lote)
);

CREATE INDEX IF NOT EXISTS idx_venta_sucursal_fecha
    ON venta (id_sucursal, fecha_venta DESC);

CREATE INDEX IF NOT EXISTS idx_venta_sesion_caja
    ON venta (id_sesion_caja, estado, metodo_pago);

CREATE INDEX IF NOT EXISTS idx_venta_cliente
    ON venta (id_cliente)
    WHERE id_cliente IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_venta_referencia_pago
    ON venta (proveedor_pago, referencia_pago)
    WHERE referencia_pago IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_detalle_venta_lote
    ON detalle_venta (id_lote);

-- =========================
-- VISTA: v_lote_estado
-- Implementa las columnas generadas que requieren JOIN a Producto.
-- Usar esta vista en lugar de la tabla directa cuando se necesiten
-- estado_vencimiento y estado_stock.
-- =========================
CREATE OR REPLACE VIEW v_lote_estado AS
SELECT
    l.*,
    CASE
        WHEN l.fecha_vencimiento < CURRENT_DATE
            THEN 'vencido'
        WHEN l.fecha_vencimiento <= (CURRENT_DATE + (p.meses_alerta_vencimiento || ' months')::INTERVAL)
            THEN 'proximo_a_vencer'
        ELSE 'normal'
    END AS estado_vencimiento,
    CASE
        WHEN l.stock_actual = 0
            THEN 'agotado'
        WHEN l.stock_actual <= p.stock_minimo
            THEN 'poco_stock'
        ELSE 'normal'
    END AS estado_stock
FROM lote l
JOIN producto p ON p.id_producto = l.id_producto;

-- =========================
-- EXTENSIONES
-- =========================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- DATOS SEMILLA DESARROLLO
-- =========================
INSERT INTO ciudad (nombre_ciudad)
VALUES ('Guatemala')
ON CONFLICT (nombre_ciudad) DO NOTHING;

INSERT INTO sucursal (id_ciudad, nombre_sucursal, direccion)
SELECT id_ciudad, 'Sucursal Central', 'Zona 1, Ciudad de Guatemala'
FROM ciudad
WHERE nombre_ciudad = 'Guatemala'
ON CONFLICT (nombre_sucursal) DO NOTHING;

INSERT INTO caja (id_sucursal, nombre)
SELECT s.id_sucursal, 'Caja principal'
FROM sucursal s
WHERE NOT EXISTS (
    SELECT 1
    FROM caja c
    WHERE c.id_sucursal = s.id_sucursal
      AND LOWER(c.nombre) = LOWER('Caja principal')
);

INSERT INTO telefono_sucursal (id_sucursal, numero)
SELECT s.id_sucursal, '2222-3333'
FROM sucursal s
WHERE s.nombre_sucursal = 'Sucursal Central'
  AND NOT EXISTS (
      SELECT 1 FROM telefono_sucursal t
      WHERE t.id_sucursal = s.id_sucursal AND t.numero = '2222-3333'
  );

INSERT INTO correo_sucursal (id_sucursal, correo)
SELECT s.id_sucursal, 'central@farma.com'
FROM sucursal s
WHERE s.nombre_sucursal = 'Sucursal Central'
  AND NOT EXISTS (
      SELECT 1 FROM correo_sucursal c
      WHERE c.correo = 'central@farma.com'
  );

INSERT INTO usuario (id_sucursal, nombre_usuario, correo_usuario, contrasena_hash, rol)
SELECT
    s.id_sucursal,
    'Dueno General',
    'dueno@farma.com',
    crypt('123456', gen_salt('bf')),
    'dueno'
FROM sucursal s
WHERE s.nombre_sucursal = 'Sucursal Central'
  AND NOT EXISTS (
      SELECT 1
      FROM usuario u
      WHERE u.correo_usuario = 'dueno@farma.com'
  );

INSERT INTO categoria (nombre)
VALUES
  ('Analgésico'),
  ('Antibiótico'),
  ('Antiinflamatorio'),
  ('Antihistamínico'),
  ('Gastroenterológico'),
  ('Vitaminas')
ON CONFLICT (nombre) DO NOTHING;
 
INSERT INTO casa_farmaceutica (nombre)
VALUES
  ('Farmacéutica ABC'),
  ('Laboratorios XYZ'),
  ('Medicamentos Globales')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO proveedor (nombre)
VALUES
  ('Proveedor Uno'),
  ('Proveedor Dos'),
  ('Proveedor Tres')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO casa_proveedor (id_casa, id_proveedor)
SELECT c.id_casa, p.id_proveedor
FROM casa_farmaceutica c
JOIN proveedor p ON p.nombre IN ('Proveedor Uno', 'Proveedor Dos')
WHERE c.nombre = 'Farmacéutica ABC'
  AND NOT EXISTS (
      SELECT 1
      FROM casa_proveedor cp
      WHERE cp.id_casa = c.id_casa AND cp.id_proveedor = p.id_proveedor
  );

INSERT INTO casa_proveedor (id_casa, id_proveedor)
SELECT c.id_casa, p.id_proveedor
FROM casa_farmaceutica c
JOIN proveedor p ON p.nombre IN ('Proveedor Dos', 'Proveedor Tres')
WHERE c.nombre = 'Laboratorios XYZ'
  AND NOT EXISTS (
      SELECT 1
      FROM casa_proveedor cp
      WHERE cp.id_casa = c.id_casa AND cp.id_proveedor = p.id_proveedor
  );

INSERT INTO casa_proveedor (id_casa, id_proveedor)
SELECT c.id_casa, p.id_proveedor
FROM casa_farmaceutica c
JOIN proveedor p ON p.nombre IN ('Proveedor Uno', 'Proveedor Tres')
WHERE c.nombre = 'Medicamentos Globales'
  AND NOT EXISTS (
      SELECT 1
      FROM casa_proveedor cp
      WHERE cp.id_casa = c.id_casa AND cp.id_proveedor = p.id_proveedor
  );

INSERT INTO producto (codigo, nombre_comercial, nombre_generico, concentracion, id_presentacion, descripcion, id_categoria, id_casa, id_proveedor, precio_compra, stock_minimo, meses_alerta_vencimiento, aplica_mayoreo)
SELECT
    'MED001-UN',
    'Tylenol',
    'Paracetamol',
    '500 mg',
    (SELECT id_presentacion FROM presentacion WHERE nombre = 'Unidad'),
    'Analgésico y antipirético para aliviar el dolor y reducir la fiebre.',
    (SELECT id_categoria FROM categoria WHERE nombre = 'Analgésico'),
    (SELECT id_casa FROM casa_farmaceutica WHERE nombre = 'Farmacéutica ABC'),
    (SELECT id_proveedor FROM proveedor WHERE nombre = 'Proveedor Uno'),
    0.50,
    10,
    6,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM producto WHERE codigo = 'MED001-UN'
);

INSERT INTO lote (
    id_producto,
    id_proveedor,
    id_sucursal,
    numero_lote,
    fecha_vencimiento,
    cantidad_ingresada,
    stock_actual,
    precio_venta,
    margen_ganancia,
    precio_mayoreo,
    cantidad_mayoreo
)
SELECT
    p.id_producto,
    pr.id_proveedor,
    s.id_sucursal,
    'LOTE-MED001-001',
    CURRENT_DATE + INTERVAL '12 months',
    30,
    30,
    1.00,
    0.30,
    NULL,
    NULL
FROM producto p
JOIN proveedor pr
  ON pr.nombre = 'Proveedor Uno'
JOIN sucursal s
  ON s.nombre_sucursal = 'Sucursal Central'
WHERE p.codigo = 'MED001-UN'
  AND NOT EXISTS (
      SELECT 1
      FROM lote l
      WHERE l.numero_lote = 'LOTE-MED001-001'
        AND l.id_producto = p.id_producto
        AND l.id_sucursal = s.id_sucursal
  );

-- Lotes de demostración para probar filtros:
-- 1) Un producto con lote en buen estado.
-- 2) Un producto con lote vencido.
-- 3) Un producto con lote próximo a vencer.

INSERT INTO producto (codigo, nombre_comercial, nombre_generico, concentracion, id_presentacion, descripcion, id_categoria, id_casa, id_proveedor, precio_compra, stock_minimo, meses_alerta_vencimiento, aplica_mayoreo)
SELECT
    'MED002-UN',
    'Amoxicilina',
    'Amoxicilina',
    '500 mg',
    (SELECT id_presentacion FROM presentacion WHERE nombre = 'Unidad'),
    'Antibiótico de demostración para probar lotes vencidos.',
    (SELECT id_categoria FROM categoria WHERE nombre = 'Antibiótico'),
    (SELECT id_casa FROM casa_farmaceutica WHERE nombre = 'Laboratorios XYZ'),
    (SELECT id_proveedor FROM proveedor WHERE nombre = 'Proveedor Dos'),
    1.20,
    10,
    6,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM producto WHERE codigo = 'MED002-UN'
);

INSERT INTO producto (codigo, nombre_comercial, nombre_generico, concentracion, id_presentacion, descripcion, id_categoria, id_casa, id_proveedor, precio_compra, stock_minimo, meses_alerta_vencimiento, aplica_mayoreo)
SELECT
    'MED003-UN',
    'Ibuprofeno',
    'Ibuprofeno',
    '400 mg',
    (SELECT id_presentacion FROM presentacion WHERE nombre = 'Unidad'),
    'Antiinflamatorio de demostración para probar lotes próximos a vencer.',
    (SELECT id_categoria FROM categoria WHERE nombre = 'Antiinflamatorio'),
    (SELECT id_casa FROM casa_farmaceutica WHERE nombre = 'Medicamentos Globales'),
    (SELECT id_proveedor FROM proveedor WHERE nombre = 'Proveedor Tres'),
    0.80,
    5,
    6,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM producto WHERE codigo = 'MED003-UN'
);

INSERT INTO lote (
    id_producto,
    id_proveedor,
    id_sucursal,
    numero_lote,
    fecha_vencimiento,
    cantidad_ingresada,
    stock_actual,
    precio_venta,
    margen_ganancia,
    precio_mayoreo,
    cantidad_mayoreo
)
SELECT
    p.id_producto,
    pr.id_proveedor,
    s.id_sucursal,
    'LOTE-MED001-BUENO',
    CURRENT_DATE + INTERVAL '12 months',
    30,
    30,
    1.00,
    0.30,
    NULL,
    NULL
FROM producto p
JOIN proveedor pr
  ON pr.nombre = 'Proveedor Uno'
JOIN sucursal s
  ON s.nombre_sucursal = 'Sucursal Central'
WHERE p.codigo = 'MED001-UN'
  AND NOT EXISTS (
      SELECT 1
      FROM lote l
      WHERE l.numero_lote = 'LOTE-MED001-BUENO'
        AND l.id_producto = p.id_producto
        AND l.id_sucursal = s.id_sucursal
  );

INSERT INTO lote (
    id_producto,
    id_proveedor,
    id_sucursal,
    numero_lote,
    fecha_vencimiento,
    cantidad_ingresada,
    stock_actual,
    precio_venta,
    margen_ganancia,
    precio_mayoreo,
    cantidad_mayoreo
)
SELECT
    p.id_producto,
    pr.id_proveedor,
    s.id_sucursal,
    'LOTE-MED002-VENCIDO',
    CURRENT_DATE - 1,
    12,
    12,
    1.35,
    0.25,
    NULL,
    NULL
FROM producto p
JOIN proveedor pr
  ON pr.nombre = 'Proveedor Dos'
JOIN sucursal s
  ON s.nombre_sucursal = 'Sucursal Central'
WHERE p.codigo = 'MED002-UN'
  AND NOT EXISTS (
      SELECT 1
      FROM lote l
      WHERE l.numero_lote = 'LOTE-MED002-VENCIDO'
        AND l.id_producto = p.id_producto
        AND l.id_sucursal = s.id_sucursal
  );

INSERT INTO lote (
    id_producto,
    id_proveedor,
    id_sucursal,
    numero_lote,
    fecha_vencimiento,
    cantidad_ingresada,
    stock_actual,
    precio_venta,
    margen_ganancia,
    precio_mayoreo,
    cantidad_mayoreo
)
SELECT
    p.id_producto,
    pr.id_proveedor,
    s.id_sucursal,
    'LOTE-MED003-PROXIMO',
    CURRENT_DATE + INTERVAL '2 months',
    18,
    18,
    1.05,
    0.28,
    NULL,
    NULL
FROM producto p
JOIN proveedor pr
  ON pr.nombre = 'Proveedor Tres'
JOIN sucursal s
  ON s.nombre_sucursal = 'Sucursal Central'
WHERE p.codigo = 'MED003-UN'
  AND NOT EXISTS (
      SELECT 1
      FROM lote l
      WHERE l.numero_lote = 'LOTE-MED003-PROXIMO'
        AND l.id_producto = p.id_producto
        AND l.id_sucursal = s.id_sucursal
  );
