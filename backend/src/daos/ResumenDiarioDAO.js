const pool = require('../database/db');

// Una sola sentencia conserva una vista consistente de ventas y cajas.
const obtener = async ({ fecha, sucursales }, conexion = pool) => {
  const { rows } = await conexion.query(`
    WITH parametros AS (
      SELECT $1::date AS fecha, statement_timestamp() AS corte
    ), sucursales AS (
      SELECT id_sucursal, nombre_sucursal FROM sucursal
      WHERE $2::integer[] IS NULL OR id_sucursal = ANY($2::integer[])
    ), ventas AS (
      SELECT v.* FROM venta v JOIN sucursales s USING (id_sucursal)
      CROSS JOIN parametros p
      WHERE v.fecha_venta >= (p.fecha::timestamp AT TIME ZONE 'America/Guatemala')
        AND v.fecha_venta < ((p.fecha + 1)::timestamp AT TIME ZONE 'America/Guatemala')
        AND v.fecha_venta <= p.corte
    ), detalles AS (
      SELECT v.id_sucursal, dv.*, l.id_producto
      FROM ventas v JOIN detalle_venta dv USING (id_venta)
      JOIN lote l USING (id_lote) WHERE v.estado = 'completada'
    ), ventas_sucursal AS (
      SELECT id_sucursal,
        COALESCE(SUM(total) FILTER (WHERE estado = 'completada'), 0) AS ingresos,
        COUNT(*) FILTER (WHERE estado = 'completada') AS ventas,
        COALESCE(SUM(total) FILTER (WHERE estado = 'completada' AND metodo_pago = 'efectivo'), 0) AS efectivo,
        COALESCE(SUM(total) FILTER (WHERE estado = 'completada' AND metodo_pago = 'tarjeta'), 0) AS tarjeta,
        COUNT(*) FILTER (WHERE estado = 'anulada') AS anulaciones,
        COALESCE(SUM(total) FILTER (WHERE estado = 'anulada'), 0) AS importe_anulado
      FROM ventas GROUP BY id_sucursal
    ), detalle_sucursal AS (
      SELECT id_sucursal, SUM(cantidad) AS unidades,
        SUM(cantidad * costo_unitario) AS costo
      FROM detalles GROUP BY id_sucursal
    ), resumen_sucursales AS (
      SELECT s.*, COALESCE(v.ingresos, 0) AS ingresos,
        COALESCE(v.ventas, 0) AS ventas, COALESCE(v.efectivo, 0) AS efectivo,
        COALESCE(v.tarjeta, 0) AS tarjeta, COALESCE(v.anulaciones, 0) AS anulaciones,
        COALESCE(v.importe_anulado, 0) AS importe_anulado,
        COALESCE(d.unidades, 0) AS unidades, COALESCE(d.costo, 0) AS costo,
        COALESCE(v.ingresos, 0) - COALESCE(d.costo, 0) AS utilidad_bruta
      FROM sucursales s LEFT JOIN ventas_sucursal v USING (id_sucursal)
      LEFT JOIN detalle_sucursal d USING (id_sucursal)
    ), productos AS (
      SELECT p.id_producto, p.nombre_comercial, SUM(d.cantidad) AS unidades,
        SUM(d.subtotal) AS ingresos
      FROM detalles d JOIN producto p USING (id_producto)
      GROUP BY p.id_producto, p.nombre_comercial
      ORDER BY unidades DESC, ingresos DESC, p.id_producto LIMIT 5
    ), cajas AS (
      SELECT s.id_sucursal, c.nombre AS nombre_caja, sc.id_sesion_caja,
        sc.fecha_operacion, sc.turno, sc.estado, sc.efectivo_esperado,
        sc.efectivo_contado, sc.diferencia_efectivo
      FROM sesion_caja sc JOIN caja c USING (id_caja)
      JOIN sucursales s ON s.id_sucursal = c.id_sucursal CROSS JOIN parametros p
      WHERE sc.fecha_operacion = p.fecha
        OR (sc.estado = 'abierta' AND sc.fecha_operacion < p.fecha)
    )
    SELECT p.corte,
      COALESCE((SELECT jsonb_agg(s ORDER BY s.nombre_sucursal, s.id_sucursal) FROM resumen_sucursales s), '[]'::jsonb) AS sucursales,
      COALESCE((SELECT jsonb_agg(t ORDER BY t.unidades DESC, t.ingresos DESC, t.id_producto) FROM productos t), '[]'::jsonb) AS productos,
      COALESCE((SELECT jsonb_agg(c ORDER BY c.id_sucursal, c.id_sesion_caja) FROM cajas c), '[]'::jsonb) AS cajas
    FROM parametros p
  `, [fecha, sucursales || null]);
  return rows[0];
};

module.exports = { obtener };
