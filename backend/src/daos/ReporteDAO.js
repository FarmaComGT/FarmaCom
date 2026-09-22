const pool = require('../database/db');

const CONFIGURACION_SERIE_VENTAS = {
  dia: { unidad: 'day', paso: '1 day' },
  semana: { unidad: 'week', paso: '1 week' },
  mes: { unidad: 'month', paso: '1 month' },
};

class ReporteDAO {
  async obtenerResumenVentas({
    id_sucursal,
    fecha_desde,
    fecha_hasta,
  } = {}) {
    const { rows } = await pool.query(
      `WITH ventas_filtradas AS (
         SELECT v.id_venta, v.total
         FROM venta v
         WHERE v.estado = 'completada'
           AND ($1::INTEGER IS NULL OR v.id_sucursal = $1)
           AND (
             $2::DATE IS NULL
             OR v.fecha_venta >= (
               $2::DATE::TIMESTAMP AT TIME ZONE 'America/Guatemala'
             )
           )
           AND (
             $3::DATE IS NULL
             OR v.fecha_venta < (
               ($3::DATE + 1)::TIMESTAMP AT TIME ZONE 'America/Guatemala'
             )
           )
       ),
       resumen_ventas AS (
         SELECT
           COALESCE(SUM(vf.total), 0)::NUMERIC(14,2) AS ingresos_totales,
           COUNT(*)::INTEGER AS total_ventas,
           COALESCE(AVG(vf.total), 0)::NUMERIC(14,2) AS ticket_promedio
         FROM ventas_filtradas vf
       ),
       resumen_unidades AS (
         SELECT
           COALESCE(SUM(dv.cantidad), 0)::INTEGER AS unidades_vendidas
         FROM ventas_filtradas vf
         JOIN detalle_venta dv ON dv.id_venta = vf.id_venta
       )
       SELECT
         rv.ingresos_totales,
         rv.total_ventas,
         rv.ticket_promedio,
         ru.unidades_vendidas
       FROM resumen_ventas rv
       CROSS JOIN resumen_unidades ru`,
      [id_sucursal || null, fecha_desde || null, fecha_hasta || null],
    );

    return rows[0];
  }

  async obtenerSerieVentas({
    id_sucursal,
    fecha_desde,
    fecha_hasta,
    agrupacion,
  }) {
    const configuracion = CONFIGURACION_SERIE_VENTAS[agrupacion]
      || CONFIGURACION_SERIE_VENTAS.dia;

    const { rows } = await pool.query(
      `WITH parametros AS (
         SELECT
           DATE_TRUNC('${configuracion.unidad}', $2::DATE::TIMESTAMP) AS periodo_desde,
           DATE_TRUNC('${configuracion.unidad}', $3::DATE::TIMESTAMP) AS periodo_hasta
       ),
       periodos AS (
         SELECT GENERATE_SERIES(
           p.periodo_desde,
           p.periodo_hasta,
           INTERVAL '${configuracion.paso}'
         ) AS periodo
         FROM parametros p
       ),
       ventas_filtradas AS (
         SELECT
           v.id_venta,
           v.total,
           DATE_TRUNC(
             '${configuracion.unidad}',
             v.fecha_venta AT TIME ZONE 'America/Guatemala'
           ) AS periodo
         FROM venta v
         WHERE v.estado = 'completada'
           AND ($1::INTEGER IS NULL OR v.id_sucursal = $1)
           AND v.fecha_venta >= (
             $2::DATE::TIMESTAMP AT TIME ZONE 'America/Guatemala'
           )
           AND v.fecha_venta < (
             ($3::DATE + 1)::TIMESTAMP AT TIME ZONE 'America/Guatemala'
           )
       ),
       ventas_agrupadas AS (
         SELECT
           vf.periodo,
           SUM(vf.total)::NUMERIC(14,2) AS ingresos,
           COUNT(*)::INTEGER AS total_ventas,
           AVG(vf.total)::NUMERIC(14,2) AS ticket_promedio
         FROM ventas_filtradas vf
         GROUP BY vf.periodo
       ),
       unidades_agrupadas AS (
         SELECT
           vf.periodo,
           SUM(dv.cantidad)::INTEGER AS unidades_vendidas
         FROM ventas_filtradas vf
         JOIN detalle_venta dv ON dv.id_venta = vf.id_venta
         GROUP BY vf.periodo
       )
       SELECT
         p.periodo::DATE AS periodo,
         COALESCE(va.ingresos, 0)::NUMERIC(14,2) AS ingresos,
         COALESCE(va.total_ventas, 0)::INTEGER AS total_ventas,
         COALESCE(va.ticket_promedio, 0)::NUMERIC(14,2) AS ticket_promedio,
         COALESCE(ua.unidades_vendidas, 0)::INTEGER AS unidades_vendidas
       FROM periodos p
       LEFT JOIN ventas_agrupadas va ON va.periodo = p.periodo
       LEFT JOIN unidades_agrupadas ua ON ua.periodo = p.periodo
       ORDER BY p.periodo ASC`,
      [id_sucursal || null, fecha_desde, fecha_hasta],
    );

    return rows;
  }

  async obtenerMetodosPago({
    id_sucursal,
    fecha_desde,
    fecha_hasta,
  } = {}) {
    const { rows } = await pool.query(
      `WITH metodos_pago (metodo_pago, orden) AS (
         VALUES ('efectivo'::VARCHAR, 1), ('tarjeta'::VARCHAR, 2)
       ),
       ventas_filtradas AS (
         SELECT v.metodo_pago, v.total
         FROM venta v
         WHERE v.estado = 'completada'
           AND ($1::INTEGER IS NULL OR v.id_sucursal = $1)
           AND (
             $2::DATE IS NULL
             OR v.fecha_venta >= (
               $2::DATE::TIMESTAMP AT TIME ZONE 'America/Guatemala'
             )
           )
           AND (
             $3::DATE IS NULL
             OR v.fecha_venta < (
               ($3::DATE + 1)::TIMESTAMP AT TIME ZONE 'America/Guatemala'
             )
           )
       ),
       ventas_agrupadas AS (
         SELECT
           vf.metodo_pago,
           COUNT(*)::INTEGER AS total_ventas,
           SUM(vf.total)::NUMERIC(14,2) AS ingresos
         FROM ventas_filtradas vf
         GROUP BY vf.metodo_pago
       ),
       ingresos_totales AS (
         SELECT COALESCE(SUM(vf.total), 0)::NUMERIC(14,2) AS total
         FROM ventas_filtradas vf
       )
       SELECT
         mp.metodo_pago,
         COALESCE(va.total_ventas, 0)::INTEGER AS total_ventas,
         COALESCE(va.ingresos, 0)::NUMERIC(14,2) AS ingresos,
         CASE
           WHEN it.total = 0 THEN 0::NUMERIC(5,2)
           ELSE ROUND(
             (COALESCE(va.ingresos, 0) * 100) / it.total,
             2
           )::NUMERIC(5,2)
         END AS porcentaje_ingresos
       FROM metodos_pago mp
       LEFT JOIN ventas_agrupadas va ON va.metodo_pago = mp.metodo_pago
       CROSS JOIN ingresos_totales it
       ORDER BY mp.orden ASC`,
      [id_sucursal || null, fecha_desde || null, fecha_hasta || null],
    );

    return rows;
  }

  async obtenerTopProductos({
    id_sucursal,
    fecha_desde,
    fecha_hasta,
    limite = 5,
    criterio = 'cantidad',
  } = {}) {
    const orden = criterio === 'ingresos'
      ? 'ingresos_generados DESC, cantidad_vendida DESC'
      : 'cantidad_vendida DESC, ingresos_generados DESC';

    const { rows } = await pool.query(
      `WITH ventas_filtradas AS (
         SELECT v.id_venta
         FROM venta v
         WHERE v.estado = 'completada'
           AND ($1::INTEGER IS NULL OR v.id_sucursal = $1)
           AND (
             $2::DATE IS NULL
             OR v.fecha_venta >= (
               $2::DATE::TIMESTAMP AT TIME ZONE 'America/Guatemala'
             )
           )
           AND (
             $3::DATE IS NULL
             OR v.fecha_venta < (
               ($3::DATE + 1)::TIMESTAMP AT TIME ZONE 'America/Guatemala'
             )
           )
       )
       SELECT
         p.id_producto,
         p.codigo,
         p.nombre_comercial,
         p.nombre_generico,
         SUM(dv.cantidad)::INTEGER AS cantidad_vendida,
         SUM(dv.subtotal)::NUMERIC(14,2) AS ingresos_generados
       FROM ventas_filtradas vf
       JOIN detalle_venta dv ON dv.id_venta = vf.id_venta
       JOIN lote l ON l.id_lote = dv.id_lote
       JOIN producto p ON p.id_producto = l.id_producto
       GROUP BY p.id_producto, p.codigo, p.nombre_comercial, p.nombre_generico
       ORDER BY ${orden}, p.id_producto ASC
       LIMIT $4`,
      [id_sucursal || null, fecha_desde || null, fecha_hasta || null, limite],
    );

    return rows;
  }

  async obtenerRentabilidad({
    id_sucursal,
    fecha_desde,
    fecha_hasta,
  } = {}) {
    const { rows } = await pool.query(
      `WITH rentabilidad_sucursal AS (
         SELECT
           v.id_sucursal,
           SUM(dv.subtotal)::NUMERIC(14,2) AS ingresos,
           SUM(dv.cantidad * dv.costo_unitario)::NUMERIC(14,2) AS costo
         FROM venta v
         JOIN detalle_venta dv ON dv.id_venta = v.id_venta
         WHERE v.estado = 'completada'
           AND ($1::INTEGER IS NULL OR v.id_sucursal = $1)
           AND (
             $2::DATE IS NULL
             OR v.fecha_venta >= (
               $2::DATE::TIMESTAMP AT TIME ZONE 'America/Guatemala'
             )
           )
           AND (
             $3::DATE IS NULL
             OR v.fecha_venta < (
               ($3::DATE + 1)::TIMESTAMP AT TIME ZONE 'America/Guatemala'
             )
           )
         GROUP BY v.id_sucursal
       )
       SELECT
         s.id_sucursal,
         s.nombre_sucursal,
         COALESCE(rs.ingresos, 0)::NUMERIC(14,2) AS ingresos,
         COALESCE(rs.costo, 0)::NUMERIC(14,2) AS costo,
         (COALESCE(rs.ingresos, 0) - COALESCE(rs.costo, 0))::NUMERIC(14,2)
           AS utilidad,
         CASE
           WHEN COALESCE(rs.ingresos, 0) = 0 THEN 0::NUMERIC(7,2)
           ELSE ROUND(
             ((rs.ingresos - rs.costo) * 100) / rs.ingresos,
             2
           )::NUMERIC(7,2)
         END AS margen
       FROM sucursal s
       LEFT JOIN rentabilidad_sucursal rs ON rs.id_sucursal = s.id_sucursal
       WHERE ($1::INTEGER IS NULL OR s.id_sucursal = $1)
       ORDER BY s.nombre_sucursal ASC, s.id_sucursal ASC`,
      [id_sucursal || null, fecha_desde || null, fecha_hasta || null],
    );

    return rows;
  }
}

module.exports = new ReporteDAO();
