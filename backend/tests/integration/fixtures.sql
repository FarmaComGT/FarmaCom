-- Datos mínimos y deterministas para las pruebas de integración.
-- No dependen del seed de demostración.
INSERT INTO ciudad (nombre_ciudad)
VALUES ('Guatemala')
ON CONFLICT (nombre_ciudad) DO NOTHING;

INSERT INTO sucursal (id_ciudad, nombre_sucursal, direccion)
SELECT id_ciudad, 'Sucursal Central', 'Zona 1, Ciudad de Guatemala'
FROM ciudad
WHERE nombre_ciudad = 'Guatemala'
ON CONFLICT (nombre_sucursal) DO NOTHING;

INSERT INTO laboratorio (id_ciudad, nombre_laboratorio, direccion)
SELECT id_ciudad, 'Laboratorio Central', 'Zona 1, Ciudad de Guatemala'
FROM ciudad
WHERE nombre_ciudad = 'Guatemala'
ON CONFLICT (nombre_laboratorio) DO NOTHING;

INSERT INTO usuario (
  id_sucursal,
  nombre_usuario,
  correo_usuario,
  contrasena_hash,
  rol
)
SELECT
  id_sucursal,
  'Dueño de Integración',
  'dueno@farma.com',
  crypt('123456', gen_salt('bf')),
  'dueno'
FROM sucursal
WHERE nombre_sucursal = 'Sucursal Central'
ON CONFLICT (correo_usuario) DO UPDATE SET
  contrasena_hash = EXCLUDED.contrasena_hash,
  estado_usuario = 'activo';

INSERT INTO usuario (
  id_sucursal,
  id_laboratorio,
  nombre_usuario,
  correo_usuario,
  contrasena_hash,
  rol
)
SELECT
  sucursal.id_sucursal,
  laboratorio.id_laboratorio,
  'Laboratorista de Integración',
  'laboratorista@farma.com',
  crypt('123456', gen_salt('bf')),
  'laboratorista'
FROM sucursal
JOIN laboratorio ON laboratorio.nombre_laboratorio = 'Laboratorio Central'
WHERE sucursal.nombre_sucursal = 'Sucursal Central'
ON CONFLICT (correo_usuario) DO UPDATE SET
  contrasena_hash = EXCLUDED.contrasena_hash,
  estado_usuario = 'activo';

INSERT INTO paciente (
  id_laboratorio,
  nombre_paciente,
  dpi,
  fecha_nacimiento,
  sexo,
  telefono,
  direccion
)
SELECT
  id_laboratorio,
  'Paciente Demo Uno',
  '1234567890101',
  DATE '1990-05-14',
  'M',
  '5555-1111',
  'Datos ficticios para integración'
FROM laboratorio
WHERE nombre_laboratorio = 'Laboratorio Central'
  AND NOT EXISTS (
    SELECT 1 FROM paciente WHERE dpi = '1234567890101'
  );

INSERT INTO expediente_laboratorio (id_paciente)
SELECT id_paciente
FROM paciente
WHERE dpi = '1234567890101'
  AND NOT EXISTS (
    SELECT 1
    FROM expediente_laboratorio
    WHERE expediente_laboratorio.id_paciente = paciente.id_paciente
  );

DELETE FROM bitacora_laboratorio
WHERE (entidad = 'paciente' AND id_entidad IN (
  SELECT id_paciente FROM paciente WHERE dpi = '9999999999999'
)) OR (entidad = 'expediente_laboratorio' AND id_entidad IN (
  SELECT e.id_expediente
  FROM expediente_laboratorio e
  JOIN paciente p ON p.id_paciente = e.id_paciente
  WHERE p.dpi = '9999999999999'
));

DELETE FROM paciente
WHERE dpi = '9999999999999';

INSERT INTO categoria (nombre)
VALUES ('Integración CI')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO casa_farmaceutica (nombre)
VALUES ('Casa Farmacéutica CI')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO proveedor (nombre)
VALUES ('Proveedor CI')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO producto (
  codigo,
  nombre_comercial,
  nombre_generico,
  concentracion,
  id_presentacion,
  id_categoria,
  id_casa,
  id_proveedor,
  precio_compra,
  stock_minimo,
  meses_alerta_vencimiento
)
SELECT
  'INT-ACIDO-001',
  'Ácido Fólico CI',
  'Ácido fólico',
  '5 mg',
  pre.id_presentacion,
  cat.id_categoria,
  casa.id_casa,
  proveedor.id_proveedor,
  10.00,
  5,
  3
FROM presentacion pre
JOIN categoria cat ON cat.nombre = 'Integración CI'
JOIN casa_farmaceutica casa ON casa.nombre = 'Casa Farmacéutica CI'
JOIN proveedor ON proveedor.nombre = 'Proveedor CI'
WHERE pre.nombre = 'Caja'
ON CONFLICT (codigo) DO UPDATE SET activo = TRUE;

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
  margen_ganancia
)
SELECT
  producto.id_producto,
  proveedor.id_proveedor,
  sucursal.id_sucursal,
  'LOTE-INTEGRACION-CI',
  CURRENT_DATE + INTERVAL '1 year',
  20,
  20,
  10.00,
  15.00,
  0.5000
FROM producto
JOIN proveedor ON proveedor.nombre = 'Proveedor CI'
JOIN sucursal ON sucursal.nombre_sucursal = 'Sucursal Central'
WHERE producto.codigo = 'INT-ACIDO-001'
ON CONFLICT (numero_lote, id_producto, id_sucursal) DO UPDATE SET
  fecha_vencimiento = EXCLUDED.fecha_vencimiento,
  stock_actual = EXCLUDED.stock_actual,
  precio_venta = EXCLUDED.precio_venta;
