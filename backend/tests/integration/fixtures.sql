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
