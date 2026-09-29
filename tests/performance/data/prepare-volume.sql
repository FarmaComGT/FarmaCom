\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE volumen_parametros (
  id_laboratorio INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO volumen_parametros (id_laboratorio)
VALUES (:lab_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM laboratorio l
    JOIN volumen_parametros v ON v.id_laboratorio = l.id_laboratorio
    WHERE l.activo = TRUE
  ) THEN
    RAISE EXCEPTION 'K6_LAB_ID no corresponde a un laboratorio activo';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM caja c
    JOIN sucursal s ON s.id_sucursal = c.id_sucursal
    WHERE s.nombre_sucursal IN ('Sucursal 1', 'Sucursal 2', 'Sucursal 3')
      AND LOWER(c.nombre) = LOWER('Caja principal')
  ) THEN
    RAISE EXCEPTION 'Primero debe ejecutarse la preparación base de rendimiento';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM usuario
    WHERE estado_usuario = 'activo'
      AND rol IN ('dueno', 'administrador')
  ) THEN
    RAISE EXCEPTION 'No existe un usuario administrativo activo para los cierres ficticios';
  END IF;
END $$;

WITH laboratorio_prueba AS (
  SELECT l.id_laboratorio
  FROM laboratorio l
  JOIN volumen_parametros v ON v.id_laboratorio = l.id_laboratorio
  WHERE l.activo = TRUE
),
datos AS (
  SELECT
    serie,
    CONCAT('K6 Paciente ', LPAD(serie::TEXT, 6, '0')) AS nombre_paciente,
    (9900000000000::BIGINT + serie)::TEXT AS dpi
  FROM GENERATE_SERIES(1, :patient_count) AS serie
)
INSERT INTO paciente (
  id_laboratorio,
  nombre_paciente,
  dpi,
  fecha_nacimiento,
  edad_manual,
  sexo,
  telefono,
  direccion,
  observaciones
)
SELECT
  l.id_laboratorio,
  d.nombre_paciente,
  d.dpi,
  DATE '1950-01-01' + ((d.serie * 17) % 20000),
  NULL,
  CASE d.serie % 3 WHEN 0 THEN 'Otro' WHEN 1 THEN 'M' ELSE 'F' END,
  NULL,
  'Dirección ficticia para pruebas de volumen',
  'Registro ficticio K6; no corresponde a una persona real'
FROM laboratorio_prueba l
CROSS JOIN datos d
ON CONFLICT DO NOTHING;

INSERT INTO expediente_laboratorio (id_paciente, antecedentes)
SELECT
  p.id_paciente,
  'Expediente ficticio preparado para pruebas de volumen con k6'
FROM paciente p
WHERE p.nombre_paciente LIKE 'K6 Paciente %'
  AND NOT EXISTS (
    SELECT 1
    FROM expediente_laboratorio e
    WHERE e.id_paciente = p.id_paciente
  );

WITH cajas_prueba AS (
  SELECT
    c.id_caja,
    ROW_NUMBER() OVER (ORDER BY c.id_caja) AS posicion,
    COUNT(*) OVER () AS cantidad
  FROM caja c
  JOIN sucursal s ON s.id_sucursal = c.id_sucursal
  WHERE s.nombre_sucursal IN ('Sucursal 1', 'Sucursal 2', 'Sucursal 3')
    AND LOWER(c.nombre) = LOWER('Caja principal')
),
usuario_prueba AS (
  SELECT id_usuario
  FROM usuario
  WHERE estado_usuario = 'activo'
    AND rol IN ('dueno', 'administrador')
  ORDER BY CASE rol WHEN 'dueno' THEN 1 ELSE 2 END, id_usuario
  LIMIT 1
),
datos AS (
  SELECT
    serie,
    CURRENT_DATE - ((serie - 1) % 365) AS fecha_operacion,
    CONCAT('K6-VOLUME-', LPAD(serie::TEXT, 6, '0')) AS marcador
  FROM GENERATE_SERIES(1, :closure_count) AS serie
)
INSERT INTO sesion_caja (
  id_caja,
  id_usuario_apertura,
  id_usuario_cierre,
  fecha_operacion,
  turno,
  fecha_hora_apertura,
  fecha_hora_cierre,
  fondo_inicial,
  total_ventas_efectivo,
  total_ventas_tarjeta,
  total_entradas,
  total_salidas,
  efectivo_esperado,
  efectivo_contado,
  diferencia_efectivo,
  cantidad_ventas,
  cantidad_anulaciones,
  estado,
  observaciones
)
SELECT
  c.id_caja,
  u.id_usuario,
  u.id_usuario,
  d.fecha_operacion,
  CASE d.serie % 3 WHEN 0 THEN 'noche' WHEN 1 THEN 'mañana' ELSE 'tarde' END,
  d.fecha_operacion::TIMESTAMP + INTERVAL '8 hours',
  d.fecha_operacion::TIMESTAMP + INTERVAL '16 hours',
  500.00,
  (d.serie % 25) * 10.00,
  (d.serie % 10) * 15.00,
  0.00,
  0.00,
  500.00 + ((d.serie % 25) * 10.00),
  500.00 + ((d.serie % 25) * 10.00),
  0.00,
  d.serie % 25,
  0,
  'cerrada',
  d.marcador
FROM datos d
JOIN cajas_prueba c ON c.posicion = ((d.serie - 1) % c.cantidad) + 1
CROSS JOIN usuario_prueba u
WHERE NOT EXISTS (
  SELECT 1
  FROM sesion_caja sc
  WHERE sc.observaciones = d.marcador
);

COMMIT;

SELECT 'pacientes_k6' AS conjunto, COUNT(*) AS registros
FROM paciente
WHERE nombre_paciente LIKE 'K6 Paciente %'
UNION ALL
SELECT 'expedientes_k6', COUNT(*)
FROM expediente_laboratorio e
JOIN paciente p ON p.id_paciente = e.id_paciente
WHERE p.nombre_paciente LIKE 'K6 Paciente %'
UNION ALL
SELECT 'cierres_k6', COUNT(*)
FROM sesion_caja
WHERE observaciones LIKE 'K6-VOLUME-%';
