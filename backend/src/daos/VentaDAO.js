const pool = require('../database/db');

class VentaDAO {
  async ejecutarEnTransaccion(operacion) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const resultado = await operacion(client);
      await client.query('COMMIT');
      return resultado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async obtenerLotesParaVenta(idsLote, client) {
    const { rows } = await client.query(
      `SELECT
         l.id_lote,
         l.id_producto,
         l.id_sucursal,
         l.stock_actual,
         l.precio_venta,
         p.precio_compra,
         l.fecha_vencimiento,
         (l.fecha_vencimiento < CURRENT_DATE) AS vencido,
         p.nombre_comercial,
         p.activo AS producto_activo
       FROM lote l
       JOIN producto p ON p.id_producto = l.id_producto
       WHERE l.id_lote = ANY($1::int[])
       ORDER BY l.id_lote
       FOR UPDATE OF l`,
      [idsLote],
    );
    return rows;
  }

  async obtenerClientePorId(id_cliente, client = pool) {
    const { rows } = await client.query(
      'SELECT id_cliente FROM cliente WHERE id_cliente = $1',
      [id_cliente],
    );
    return rows[0] || null;
  }

  async crearVenta({
    id_sucursal,
    id_usuario,
    id_sesion_caja,
    id_cliente,
    metodo_pago,
    proveedor_pago,
    referencia_pago,
    estado_pago,
    autorizacion_pago,
    tarjeta_ultimos4,
    total,
    monto_recibido,
    cambio,
  }, client) {
    const { rows } = await client.query(
      `INSERT INTO venta (
         id_sucursal,
         id_usuario,
         id_sesion_caja,
         id_cliente,
         metodo_pago,
         proveedor_pago,
         referencia_pago,
         estado_pago,
         autorizacion_pago,
         tarjeta_ultimos4,
         total,
         monto_recibido,
         cambio
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id_sucursal,
        id_usuario,
        id_sesion_caja,
        id_cliente ?? null,
        metodo_pago,
        proveedor_pago,
        referencia_pago,
        estado_pago,
        autorizacion_pago,
        tarjeta_ultimos4,
        total,
        monto_recibido,
        cambio,
      ],
    );
    return rows[0];
  }

  async crearPagoPOS({
    external_id,
    id_sucursal,
    id_usuario,
    id_sesion_caja,
    id_cliente,
    terminal_id,
    total,
    detalles,
  }, client) {
    const { rows } = await client.query(
      `INSERT INTO pago_pos (
         external_id,
         id_sucursal,
         id_usuario,
         id_sesion_caja,
         id_cliente,
         terminal_id,
         total,
         detalles
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING *`,
      [
        external_id,
        id_sucursal,
        id_usuario,
        id_sesion_caja,
        id_cliente ?? null,
        terminal_id,
        total,
        JSON.stringify(detalles),
      ],
    );
    return rows[0];
  }

  async obtenerPagoPOSPorExternalId(external_id, client = pool, bloquear = false) {
    const { rows } = await client.query(
      `SELECT *
       FROM pago_pos
       WHERE external_id = $1
       ${bloquear ? 'FOR UPDATE' : ''}`,
      [external_id],
    );
    return rows[0] || null;
  }

  async actualizarPagoPOS({
    external_id,
    estado,
    estado_pago,
    comando_recurrente_id,
    evento_recurrente_id,
    referencia_pago,
    autorizacion_pago,
    tarjeta_ultimos4,
    id_venta,
  }, client) {
    const { rows } = await client.query(
      `UPDATE pago_pos
       SET estado = COALESCE($2, estado),
           estado_pago = COALESCE($3, estado_pago),
           comando_recurrente_id = COALESCE($4, comando_recurrente_id),
           evento_recurrente_id = COALESCE($5, evento_recurrente_id),
           referencia_pago = COALESCE($6, referencia_pago),
           autorizacion_pago = COALESCE($7, autorizacion_pago),
           tarjeta_ultimos4 = COALESCE($8, tarjeta_ultimos4),
           id_venta = COALESCE($9, id_venta),
           actualizado_en = CURRENT_TIMESTAMP
       WHERE external_id = $1
       RETURNING *`,
      [
        external_id,
        estado ?? null,
        estado_pago ?? null,
        comando_recurrente_id ?? null,
        evento_recurrente_id ?? null,
        referencia_pago ?? null,
        autorizacion_pago ?? null,
        tarjeta_ultimos4 ?? null,
        id_venta ?? null,
      ],
    );
    return rows[0] || null;
  }

  async crearDetalle({
    id_venta,
    id_lote,
    cantidad,
    precio_unitario,
    costo_unitario,
  }, client) {
    const { rows } = await client.query(
      `INSERT INTO detalle_venta (
         id_venta,
         id_lote,
         cantidad,
         precio_unitario,
         costo_unitario
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_venta, id_lote, cantidad, precio_unitario, costo_unitario],
    );
    return rows[0];
  }

  async descontarStock(id_lote, cantidad, client) {
    const { rows } = await client.query(
      `UPDATE lote
       SET stock_actual = stock_actual - $1
       WHERE id_lote = $2
         AND stock_actual >= $1
       RETURNING id_lote, stock_actual`,
      [cantidad, id_lote],
    );
    return rows[0] || null;
  }

  async obtenerTodas({
    id_sucursal,
    id_cliente,
    estado,
    fecha_desde,
    fecha_hasta,
  } = {}) {
    const condiciones = [];
    const valores = [];

    const agregarCondicion = (condicion, valor) => {
      valores.push(valor);
      condiciones.push(condicion.replace('?', `$${valores.length}`));
    };

    if (id_sucursal) agregarCondicion('v.id_sucursal = ?', id_sucursal);
    if (id_cliente) agregarCondicion('v.id_cliente = ?', id_cliente);
    if (estado) agregarCondicion('v.estado = ?', estado);
    if (fecha_desde) agregarCondicion('v.fecha_venta >= ?::date', fecha_desde);
    if (fecha_hasta) {
      agregarCondicion("v.fecha_venta < (?::date + INTERVAL '1 day')", fecha_hasta);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT
         v.*,
         s.nombre_sucursal,
         u.nombre_usuario,
         c.nombre_cliente,
         COALESCE(SUM(dv.cantidad), 0)::INTEGER AS cantidad_articulos
       FROM venta v
       JOIN sucursal s ON s.id_sucursal = v.id_sucursal
       JOIN usuario u ON u.id_usuario = v.id_usuario
       LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       ${where}
       GROUP BY
         v.id_venta,
         s.nombre_sucursal,
         u.nombre_usuario,
         c.nombre_cliente
       ORDER BY v.fecha_venta DESC, v.id_venta DESC`,
      valores,
    );
    return rows;
  }

  async obtenerPorId(id_venta, client = pool) {
    const { rows } = await client.query(
      `SELECT
         v.*,
         s.nombre_sucursal,
         u.nombre_usuario,
         c.nombre_cliente,
         COALESCE(
           json_agg(
             json_build_object(
               'id_detalle_venta', dv.id_detalle_venta,
               'id_lote', dv.id_lote,
               'id_producto', l.id_producto,
               'numero_lote', l.numero_lote,
               'nombre_comercial', p.nombre_comercial,
               'cantidad', dv.cantidad,
               'precio_unitario', dv.precio_unitario,
               'costo_unitario', dv.costo_unitario,
               'subtotal', dv.subtotal
             )
             ORDER BY dv.id_detalle_venta
           ) FILTER (WHERE dv.id_detalle_venta IS NOT NULL),
           '[]'::json
         ) AS detalles
       FROM venta v
       JOIN sucursal s ON s.id_sucursal = v.id_sucursal
       JOIN usuario u ON u.id_usuario = v.id_usuario
       LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       LEFT JOIN lote l ON l.id_lote = dv.id_lote
       LEFT JOIN producto p ON p.id_producto = l.id_producto
       WHERE v.id_venta = $1
       GROUP BY
         v.id_venta,
         s.nombre_sucursal,
         u.nombre_usuario,
         c.nombre_cliente`,
      [id_venta],
    );
    return rows[0] || null;
  }

  async obtenerParaActualizar(id_venta, client) {
    const { rows } = await client.query(
      'SELECT * FROM venta WHERE id_venta = $1 FOR UPDATE',
      [id_venta],
    );
    return rows[0] || null;
  }

  async obtenerDetallesParaAnulacion(id_venta, client) {
    const { rows } = await client.query(
      `SELECT id_lote, cantidad
       FROM detalle_venta
       WHERE id_venta = $1
       ORDER BY id_lote
       FOR UPDATE`,
      [id_venta],
    );
    return rows;
  }

  async restaurarStock(id_lote, cantidad, client) {
    const { rows } = await client.query(
      `UPDATE lote
       SET stock_actual = stock_actual + $1
       WHERE id_lote = $2
       RETURNING id_lote, stock_actual`,
      [cantidad, id_lote],
    );
    return rows[0] || null;
  }

  async actualizarCliente(id_venta, id_cliente, client) {
    const { rows } = await client.query(
      `UPDATE venta
       SET id_cliente = $1
       WHERE id_venta = $2
       RETURNING *`,
      [id_cliente ?? null, id_venta],
    );
    return rows[0] || null;
  }

  async anular(id_venta, motivo_anulacion, client) {
    const { rows } = await client.query(
      `UPDATE venta
       SET estado = 'anulada',
           fecha_anulacion = CURRENT_TIMESTAMP,
           motivo_anulacion = $1
       WHERE id_venta = $2
       RETURNING *`,
      [motivo_anulacion || null, id_venta],
    );
    return rows[0] || null;
  }
}

module.exports = new VentaDAO();
