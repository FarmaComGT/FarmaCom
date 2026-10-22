-- Datos de demostración para entornos locales.
-- No ejecutar en producción.

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

-- =========================
-- DATOS SEMILLA: módulo de laboratorio
-- =========================
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

-- Usuario tecnico usado por el job automatico de vencimiento de resultados
-- (purgarResultadosVencidos) para dejar registro en bitacora_laboratorio,
-- que exige un id_usuario responsable. estado_usuario='inactivo' bloquea
-- cualquier intento de inicio de sesion con esta cuenta.
INSERT INTO usuario (id_sucursal, nombre_usuario, correo_usuario, contrasena_hash, rol, estado_usuario)
SELECT
    s.id_sucursal,
    'Sistema (vencimiento automatico)',
    'sistema.laboratorio@farmacom.local',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    'administrador',
    'inactivo'
FROM sucursal s
WHERE s.nombre_sucursal = 'Sucursal Central'
  AND NOT EXISTS (
      SELECT 1
      FROM usuario u
      WHERE u.correo_usuario = 'sistema.laboratorio@farmacom.local'
  );

INSERT INTO paciente (id_laboratorio, nombre_paciente, dpi, fecha_nacimiento, sexo, telefono, direccion)
SELECT l.id_laboratorio, 'Paciente Demo Uno', '1234567890101', DATE '1990-05-14', 'M', '5555-1111', 'Zona 1, Ciudad de Guatemala'
FROM laboratorio l
WHERE l.nombre_laboratorio = 'Laboratorio Central'
  AND NOT EXISTS (SELECT 1 FROM paciente WHERE dpi = '1234567890101');

INSERT INTO paciente (id_laboratorio, nombre_paciente, dpi, fecha_nacimiento, sexo, telefono, direccion)
SELECT l.id_laboratorio, 'Paciente Demo Dos', '9876543210202', DATE '1985-11-02', 'F', '5555-2222', 'Zona 10, Ciudad de Guatemala'
FROM laboratorio l
WHERE l.nombre_laboratorio = 'Laboratorio Central'
  AND NOT EXISTS (SELECT 1 FROM paciente WHERE dpi = '9876543210202');

INSERT INTO expediente_laboratorio (id_paciente)
SELECT p.id_paciente
FROM paciente p
WHERE p.dpi IN ('1234567890101', '9876543210202')
  AND NOT EXISTS (
      SELECT 1 FROM expediente_laboratorio e WHERE e.id_paciente = p.id_paciente
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
    precio_compra,
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
    p.precio_compra,
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
    precio_compra,
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
    p.precio_compra,
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
    precio_compra,
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
    p.precio_compra,
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
    precio_compra,
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
    p.precio_compra,
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

