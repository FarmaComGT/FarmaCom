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

  async crearPuntoRestauracionVentaPOS(client) {
    await client.query('SAVEPOINT completar_venta_pos');
  }

  async restaurarPuntoVentaPOS(client) {
    await client.query('ROLLBACK TO SAVEPOINT completar_venta_pos');
  }

  async liberarPuntoRestauracionVentaPOS(client) {
    await client.query('RELEASE SAVEPOINT completar_venta_pos');
  }

  async obtenerLotesParaVenta(idsLote, client) {
    const { rows } = await client.query(
      `SELECT
         l.id_lote,
         l.id_producto,
         l.id_sucursal,
         l.stock_actual,
         l.stock_reservado,
         (l.stock_actual - l.stock_reservado) AS stock_disponible,
         l.precio_venta,
         l.precio_compra,
         l.fecha_vencimiento,
         COALESCE(l.fecha_vencimiento < CURRENT_DATE, FALSE) AS vencido,
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

  async bloquearClaveIdempotencia(clave_idempotencia, client) {
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [clave_idempotencia],
    );
  }

  async obtenerVentaPorClaveIdempotencia(clave_idempotencia, client = pool) {
    const { rows } = await client.query(
      `SELECT id_venta, id_usuario, id_sucursal, huella_idempotencia
       FROM venta
       WHERE clave_idempotencia = $1`,
      [clave_idempotencia],
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
    clave_idempotencia,
    huella_idempotencia,
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
         clave_idempotencia,
         huella_idempotencia,
         total,
         monto_recibido,
         cambio
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        clave_idempotencia ?? null,
        huella_idempotencia ?? null,
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
    carrito_origen_id,
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
         carrito_origen_id,
         terminal_id,
         total,
         detalles
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       RETURNING *`,
      [
        external_id,
        id_sucursal,
        id_usuario,
        id_sesion_caja,
        id_cliente ?? null,
        carrito_origen_id ?? null,
        terminal_id,
        total,
        JSON.stringify(detalles),
      ],
    );
    return rows[0];
  }

  async reservarStockPagoPOS(id_pago_pos, { id_lote, cantidad }, client) {
    const { rows: lotes } = await client.query(
      `UPDATE lote
       SET stock_reservado = stock_reservado + $1,
           version = version + 1
       WHERE id_lote = $2
         AND (stock_actual - stock_reservado) >= $1
       RETURNING id_lote, stock_actual, stock_reservado`,
      [cantidad, id_lote],
    );
    if (!lotes[0]) return null;

    const { rows } = await client.query(
      `INSERT INTO reserva_inventario_pago (id_pago_pos, id_lote, cantidad)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id_pago_pos, id_lote, cantidad],
    );
    return rows[0];
  }

  async obtenerReservasActivasPagoPOS(id_pago_pos, client) {
    const { rows } = await client.query(
      `SELECT *
       FROM reserva_inventario_pago
       WHERE id_pago_pos = $1 AND estado = 'reservada'
       ORDER BY id_lote
       FOR UPDATE`,
      [id_pago_pos],
    );
    return rows;
  }

  async consumirReservaPagoPOS({ id_reserva, id_lote, cantidad }, client) {
    const { rows: reservas } = await client.query(
      `UPDATE reserva_inventario_pago
       SET estado = 'consumida', actualizado_en = CURRENT_TIMESTAMP
       WHERE id_reserva = $1 AND estado = 'reservada'
       RETURNING id_reserva`,
      [id_reserva],
    );
    if (!reservas[0]) return null;
    const { rows } = await client.query(
      `UPDATE lote
       SET stock_actual = stock_actual - $1,
           stock_reservado = stock_reservado - $1,
           version = version + 1
       WHERE id_lote = $2
         AND stock_actual >= $1
         AND stock_reservado >= $1
       RETURNING id_lote, stock_actual, stock_reservado`,
      [cantidad, id_lote],
    );
    return rows[0] || null;
  }

  async liberarReservaPagoPOS({ id_reserva, id_lote, cantidad }, client) {
    const { rows: reservas } = await client.query(
      `UPDATE reserva_inventario_pago
       SET estado = 'liberada', actualizado_en = CURRENT_TIMESTAMP
       WHERE id_reserva = $1 AND estado = 'reservada'
       RETURNING id_reserva`,
      [id_reserva],
    );
    if (!reservas[0]) return null;
    const { rows } = await client.query(
      `UPDATE lote
       SET stock_reservado = stock_reservado - $1,
           version = version + 1
       WHERE id_lote = $2 AND stock_reservado >= $1
       RETURNING id_lote, stock_actual, stock_reservado`,
      [cantidad, id_lote],
    );
    return rows[0] || null;
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
    estados_permitidos,
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
         AND ($10::text[] IS NULL OR estado = ANY($10::text[]))
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
        estados_permitidos ?? null,
      ],
    );
    return rows[0] || null;
  }

  async registrarIncidenciaPagoPOS({
    external_id,
    estado_pago,
    evento_recurrente_id,
    referencia_pago,
    autorizacion_pago,
    tarjeta_ultimos4,
    codigo_incidencia,
    detalle_incidencia,
  }, client) {
    const { rows } = await client.query(
      `UPDATE pago_pos
       SET estado = 'incidencia',
           estado_pago = COALESCE($2, estado_pago),
           evento_recurrente_id = COALESCE($3, evento_recurrente_id),
           referencia_pago = COALESCE($4, referencia_pago),
           autorizacion_pago = COALESCE($5, autorizacion_pago),
           tarjeta_ultimos4 = COALESCE($6, tarjeta_ultimos4),
           codigo_incidencia = $7,
           detalle_incidencia = $8,
           incidencia_en = CURRENT_TIMESTAMP,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE external_id = $1
         AND estado IN ('pendiente', 'procesando')
       RETURNING *`,
      [
        external_id,
        estado_pago ?? null,
        evento_recurrente_id ?? null,
        referencia_pago ?? null,
        autorizacion_pago ?? null,
        tarjeta_ultimos4 ?? null,
        codigo_incidencia,
        detalle_incidencia,
      ],
    );
    return rows[0] || null;
  }

  async marcarPagoPOSConciliado({
    external_id,
    id_venta,
    id_usuario_conciliacion,
  }, client) {
    const { rows } = await client.query(
      `UPDATE pago_pos
       SET estado = 'pagado',
           id_venta = $2,
           conciliado_en = CURRENT_TIMESTAMP,
           id_usuario_conciliacion = $3,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE external_id = $1 AND estado = 'incidencia'
       RETURNING *`,
      [external_id, id_venta, id_usuario_conciliacion],
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
         costo_unitario,
         id_producto_historico,
         numero_lote_historico,
         nombre_producto_historico
       )
       SELECT $1, $2, $3, $4, $5, l.id_producto, l.numero_lote, p.nombre_comercial
       FROM lote l
       JOIN producto p ON p.id_producto = l.id_producto
       WHERE l.id_lote = $2
       RETURNING *`,
      [id_venta, id_lote, cantidad, precio_unitario, costo_unitario],
    );
    return rows[0];
  }

  async descontarStock(id_lote, cantidad, client) {
    const { rows } = await client.query(
      `UPDATE lote
       SET stock_actual = stock_actual - $1,
           version = version + 1
       WHERE id_lote = $2
         AND (stock_actual - stock_reservado) >= $1
       RETURNING id_lote, stock_actual`,
      [cantidad, id_lote],
    );
    return rows[0] || null;
  }

  async obtenerTodas({
    pagina,
    limite = 25,
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
    if (fecha_desde) {
      agregarCondicion(
        "v.fecha_venta >= (?::DATE::TIMESTAMP AT TIME ZONE 'America/Guatemala')",
        fecha_desde,
      );
    }
    if (fecha_hasta) {
      agregarCondicion(
        "v.fecha_venta < ((?::DATE + 1)::TIMESTAMP AT TIME ZONE 'America/Guatemala')",
        fecha_hasta,
      );
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
    let paginacion;
    let paginaVentas = '';
    if (pagina !== undefined) {
      const conteo = await pool.query(`SELECT COUNT(*) AS total FROM venta v ${where}`, valores);
      const { crearPaginacion } = require('../utils/paginacion');
      paginacion = crearPaginacion(pagina, limite, Number(conteo.rows[0].total));
      paginaVentas = `JOIN (SELECT id_venta FROM venta v ${where}
        ORDER BY v.fecha_venta DESC, v.id_venta DESC
        LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}) pagina_ventas
        ON pagina_ventas.id_venta = v.id_venta`;
      valores.push(limite, (paginacion.pagina - 1) * limite);
    }
    const { rows } = await pool.query(
      `SELECT
         v.*,
         s.nombre_sucursal,
         u.nombre_usuario,
         ua.nombre_usuario AS nombre_usuario_anulacion,
         c.nombre_cliente,
         COALESCE(SUM(dv.cantidad), 0)::INTEGER AS cantidad_articulos
       FROM venta v
       ${paginaVentas}
       JOIN sucursal s ON s.id_sucursal = v.id_sucursal
       JOIN usuario u ON u.id_usuario = v.id_usuario
       LEFT JOIN usuario ua ON ua.id_usuario = v.id_usuario_anulacion
       LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       ${where}
       GROUP BY
         v.id_venta,
         s.nombre_sucursal,
         u.nombre_usuario,
         ua.nombre_usuario,
         c.nombre_cliente
       ORDER BY v.fecha_venta DESC, v.id_venta DESC`,
      valores,
    );
    return paginacion ? { datos: rows, paginacion } : rows;
  }

  async obtenerPorId(id_venta, client = pool) {
    const { rows } = await client.query(
      `SELECT
         v.*,
         s.nombre_sucursal,
         u.nombre_usuario,
         ua.nombre_usuario AS nombre_usuario_anulacion,
         c.nombre_cliente,
         COALESCE(
           json_agg(
             json_build_object(
               'id_detalle_venta', dv.id_detalle_venta,
               'id_lote', dv.id_lote,
               'id_producto', COALESCE(dv.id_producto_historico, l.id_producto),
               'numero_lote', COALESCE(dv.numero_lote_historico, l.numero_lote),
               'nombre_comercial', COALESCE(dv.nombre_producto_historico, p.nombre_comercial),
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
       LEFT JOIN usuario ua ON ua.id_usuario = v.id_usuario_anulacion
       LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
       LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
       LEFT JOIN lote l ON l.id_lote = dv.id_lote
       LEFT JOIN producto p ON p.id_producto = l.id_producto
       WHERE v.id_venta = $1
       GROUP BY
         v.id_venta,
         s.nombre_sucursal,
         u.nombre_usuario,
         ua.nombre_usuario,
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
       SET stock_actual = stock_actual + $1,
           version = version + 1
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

  async anular(id_venta, motivo_anulacion, id_usuario_anulacion, client) {
    const { rows } = await client.query(
      `UPDATE venta
       SET estado = 'anulada',
           fecha_anulacion = CURRENT_TIMESTAMP,
           motivo_anulacion = $1,
           id_usuario_anulacion = $2
       WHERE id_venta = $3
         AND estado = 'completada'
       RETURNING *`,
      [motivo_anulacion, id_usuario_anulacion, id_venta],
    );
    return rows[0] || null;
  }
}

module.exports = new VentaDAO();
