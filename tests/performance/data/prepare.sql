\set ON_ERROR_STOP on

BEGIN;

INSERT INTO ciudad (nombre_ciudad)
VALUES
  ('Ciudad de Prueba 1'),
  ('Ciudad de Prueba 2'),
  ('Ciudad de Prueba 3')
ON CONFLICT (nombre_ciudad) DO NOTHING;

UPDATE sucursal
SET
  nombre_sucursal = 'Sucursal 1',
  id_ciudad = (SELECT id_ciudad FROM ciudad WHERE nombre_ciudad = 'Ciudad de Prueba 1'),
  direccion = 'Dirección ficticia 1'
WHERE nombre_sucursal IN ('Sucursal Central', 'Sucursal 1');

UPDATE sucursal
SET
  nombre_sucursal = 'Sucursal 2',
  id_ciudad = (SELECT id_ciudad FROM ciudad WHERE nombre_ciudad = 'Ciudad de Prueba 2'),
  direccion = 'Dirección ficticia 2'
WHERE nombre_sucursal = 'Sucursal 2';

UPDATE sucursal
SET
  nombre_sucursal = 'Sucursal 3',
  id_ciudad = (SELECT id_ciudad FROM ciudad WHERE nombre_ciudad = 'Ciudad de Prueba 3'),
  direccion = 'Dirección ficticia 3'
WHERE nombre_sucursal = 'Sucursal 3';

INSERT INTO sucursal (id_ciudad, nombre_sucursal, direccion)
SELECT
  c.id_ciudad,
  datos.nombre_sucursal,
  datos.direccion
FROM ciudad c
CROSS JOIN LATERAL (
  VALUES
    ('Ciudad de Prueba 1', 'Sucursal 1', 'Dirección ficticia 1'),
    ('Ciudad de Prueba 2', 'Sucursal 2', 'Dirección ficticia 2'),
    ('Ciudad de Prueba 3', 'Sucursal 3', 'Dirección ficticia 3')
) AS datos(nombre_ciudad, nombre_sucursal, direccion)
WHERE c.nombre_ciudad = datos.nombre_ciudad
ON CONFLICT (nombre_sucursal) DO NOTHING;

INSERT INTO caja (id_sucursal, nombre)
SELECT s.id_sucursal, 'Caja principal'
FROM sucursal s
WHERE s.nombre_sucursal IN (
  'Sucursal 1',
  'Sucursal 2',
  'Sucursal 3'
)
AND NOT EXISTS (
  SELECT 1
  FROM caja c
  WHERE c.id_sucursal = s.id_sucursal
    AND LOWER(c.nombre) = LOWER('Caja principal')
);

WITH sucursales_prueba AS (
  SELECT *
  FROM (
    VALUES
      ('Sucursal 1', 'SUCURSAL1'),
      ('Sucursal 2', 'SUCURSAL2'),
      ('Sucursal 3', 'SUCURSAL3')
  ) AS datos(nombre_sucursal, codigo_sucursal)
)
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
  p.id_proveedor,
  s.id_sucursal,
  CONCAT('K6-PERF-', sp.codigo_sucursal, '-', p.codigo),
  CURRENT_DATE + INTERVAL '18 months',
  500,
  500,
  ROUND((p.precio_compra * 1.40)::NUMERIC, 2),
  0.30,
  NULL,
  NULL
FROM sucursales_prueba sp
JOIN sucursal s ON s.nombre_sucursal = sp.nombre_sucursal
CROSS JOIN producto p
WHERE p.activo = TRUE
  AND p.id_proveedor IS NOT NULL
ON CONFLICT (numero_lote, id_producto, id_sucursal) DO NOTHING;

COMMIT;

SELECT
  s.id_sucursal,
  s.nombre_sucursal,
  c.id_caja,
  STRING_AGG(l.id_lote::TEXT, ', ' ORDER BY l.id_lote) AS lotes_rendimiento
FROM sucursal s
JOIN caja c
  ON c.id_sucursal = s.id_sucursal
 AND LOWER(c.nombre) = LOWER('Caja principal')
JOIN lote l
  ON l.id_sucursal = s.id_sucursal
 AND l.numero_lote LIKE 'K6-PERF-%'
WHERE s.nombre_sucursal IN (
  'Sucursal 1',
  'Sucursal 2',
  'Sucursal 3'
)
GROUP BY s.id_sucursal, s.nombre_sucursal, c.id_caja
ORDER BY s.id_sucursal;
