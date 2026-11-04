const pool = require('../database/db');

class HistorialCompraDAO {
  async obtenerPorCliente({
    id_cliente,
    id_sucursal,
    estado,
    fecha_desde,
    fecha_hasta,
    pagina,
    limite = 25,
  }) {
    const condiciones = ['v.id_cliente = $1'];
    const valores = [id_cliente];

    const agregarCondicion = (condicion, valor) => {
      valores.push(valor);
      condiciones.push(condicion.replace('?', `$${valores.length}`));
    };

    if (id_sucursal) agregarCondicion('v.id_sucursal = ?', id_sucursal);
    if (estado) agregarCondicion('v.estado = ?', estado);
    if (fecha_desde) agregarCondicion('v.fecha_venta >= ?::date', fecha_desde);
    if (fecha_hasta) {
      agregarCondicion("v.fecha_venta < (?::date + INTERVAL '1 day')", fecha_hasta);
    }

    let paginacion;
    let resumen;
    if (pagina !== undefined) {
      const agregado = await pool.query(`
        SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE v.estado <> 'anulada') AS total_compras,
          COALESCE(SUM(v.total) FILTER (WHERE v.estado <> 'anulada'), 0) AS monto_total,
          COALESCE(SUM((SELECT COALESCE(SUM(d.cantidad), 0) FROM detalle_venta d
            WHERE d.id_venta = v.id_venta)) FILTER (WHERE v.estado <> 'anulada'), 0) AS total_articulos
        FROM venta v WHERE ${condiciones.join(' AND ')}`, valores);
      const fila = agregado.rows[0];
      const { crearPaginacion } = require('../utils/paginacion');
      paginacion = crearPaginacion(pagina, limite, Number(fila.total));
      resumen = { total_compras: Number(fila.total_compras), total_articulos: Number(fila.total_articulos),
        monto_total: Number(fila.monto_total).toFixed(2) };
    }
    // Limitar las ventas antes de unir sus artículos evita agregar todo el historial.
    const paginaVentas = paginacion
      ? `JOIN (SELECT id_venta FROM venta v WHERE ${condiciones.join(' AND ')}
          ORDER BY v.fecha_venta DESC, v.id_venta DESC
          LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}) pagina_ventas
          ON pagina_ventas.id_venta = v.id_venta`
      : '';
    if (paginacion) valores.push(limite, (paginacion.pagina - 1) * limite);
    const { rows } = await pool.query(
      `SELECT
         v.id_venta,
         v.id_sucursal,
         s.nombre_sucursal,
         v.id_usuario,
         u.nombre_usuario,
         v.id_cliente,
         c.nombre_cliente,
         v.metodo_pago,
         v.total,
         v.monto_recibido,
         v.cambio,
         v.estado,
         v.fecha_venta,
         v.fecha_anulacion,
         v.motivo_anulacion,
         COALESCE(SUM(dv.cantidad), 0)::INTEGER AS cantidad_articulos,
         COALESCE(
           json_agg(
             json_build_object(
               'id_detalle_venta', dv.id_detalle_venta,
               'id_lote', dv.id_lote,
               'numero_lote', l.numero_lote,
               'id_producto', p.id_producto,
               'codigo', p.codigo,
               'nombre_comercial', p.nombre_comercial,
               'nombre_generico', p.nombre_generico,
               'concentracion', p.concentracion,
               'presentacion', pr.nombre,
               'cantidad', dv.cantidad,
               'precio_unitario', dv.precio_unitario,
               'subtotal', dv.subtotal
             )
             ORDER BY dv.id_detalle_venta
           ) FILTER (WHERE dv.id_detalle_venta IS NOT NULL),
           '[]'::json
         ) AS detalles
       FROM venta v
       ${paginaVentas}
       JOIN sucursal s ON s.id_sucursal = v.id_sucursal
       JOIN usuario u ON u.id_usuario = v.id_usuario
       JOIN cliente c ON c.id_cliente = v.id_cliente
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       LEFT JOIN lote l ON l.id_lote = dv.id_lote
       LEFT JOIN producto p ON p.id_producto = l.id_producto
       LEFT JOIN presentacion pr ON pr.id_presentacion = p.id_presentacion
       WHERE ${condiciones.join(' AND ')}
       GROUP BY
         v.id_venta,
         s.nombre_sucursal,
         u.nombre_usuario,
         c.nombre_cliente
       ORDER BY v.fecha_venta DESC, v.id_venta DESC`,
      valores,
    );

    return paginacion ? { compras: rows, paginacion, resumen } : rows;
  }
}

module.exports = new HistorialCompraDAO();
