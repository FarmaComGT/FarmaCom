const pool = require('../database/db');

class LoteDAO {

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

  // CREATE

  async crear({
    id_producto,
    id_proveedor,
    id_sucursal,
    numero_lote,
    fecha_vencimiento,
    cantidad_ingresada,
    precio_compra,
    precio_venta,
    margen_ganancia,
    precio_mayoreo,
    cantidad_mayoreo,
  }, client = pool) {
    const query = `
      INSERT INTO lote (
        id_producto, id_proveedor, id_sucursal,
        numero_lote, fecha_vencimiento,
        cantidad_ingresada, stock_actual,
        precio_compra, precio_venta, margen_ganancia, precio_mayoreo, cantidad_mayoreo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const { rows } = await client.query(query, [
      id_producto,
      id_proveedor,
      id_sucursal,
      numero_lote,
      fecha_vencimiento,
      cantidad_ingresada,
      precio_compra,
      precio_venta,
      margen_ganancia,
      precio_mayoreo   ?? null,
      cantidad_mayoreo ?? null,
    ]);
    return rows[0];
  }

  // OBTENER

  async bloquearHistorialProductoSucursal(id_producto, id_sucursal, client = pool) {
    await client.query(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [id_producto, id_sucursal],
    );
  }

  async obtenerUltimoPorProductoSucursal(id_producto, id_sucursal, client = pool) {
    const { rows } = await client.query(
      `SELECT *
       FROM lote
       WHERE id_producto = $1
         AND id_sucursal = $2
       ORDER BY fecha_ingreso DESC, id_lote DESC
       LIMIT 1`,
      [id_producto, id_sucursal],
    );
    return rows[0] || null;
  }

  // Lista todos los lotes de una sucursal con estados calculados utilizando la vista v_lote_estado
  async obtenerPorSucursal(id_sucursal) {
    const query = `
      SELECT
        v.*,
        p.nombre_comercial,
        p.nombre_generico,
        p.concentracion,
        pre.nombre AS presentacion,
        pr.nombre AS proveedor_nombre
      FROM v_lote_estado v
      JOIN producto  p  ON p.id_producto   = v.id_producto
      JOIN presentacion pre ON pre.id_presentacion = p.id_presentacion
      JOIN proveedor pr ON pr.id_proveedor = v.id_proveedor
      WHERE v.id_sucursal = $1
      ORDER BY v.fecha_vencimiento ASC NULLS LAST, v.id_lote
    `;
    const { rows } = await pool.query(query, [id_sucursal]);
    return rows;
  }

  // Lista todos los lotes de un producto en todas las sucursales
  async obtenerPorProducto(id_producto, id_sucursal = null, filtros) {
    const valores = [id_producto, id_sucursal];
    const condiciones = ['v.id_producto = $1', '($2::INTEGER IS NULL OR v.id_sucursal = $2)'];
    for (const campo of ['estado_stock', 'estado_vencimiento']) {
      if (filtros?.[campo]) {
        valores.push(filtros[campo]);
        condiciones.push(`v.${campo} = $${valores.length}`);
      }
    }
    let paginacion;
    let limites = '';
    if (filtros) {
      const conteo = await pool.query(`SELECT COUNT(*) AS total FROM v_lote_estado v
        WHERE ${condiciones.join(' AND ')}`, valores);
      const { crearPaginacion } = require('../utils/paginacion');
      paginacion = crearPaginacion(filtros.pagina, filtros.limite, Number(conteo.rows[0].total));
      limites = `LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`;
      valores.push(paginacion.limite, (paginacion.pagina - 1) * paginacion.limite);
    }
    const query = `
      SELECT
        v.*,
        p.concentracion,
        pre.nombre AS presentacion,
        s.nombre_sucursal,
        pr.nombre AS proveedor_nombre
      FROM v_lote_estado v
      JOIN producto  p  ON p.id_producto   = v.id_producto
      JOIN presentacion pre ON pre.id_presentacion = p.id_presentacion
      JOIN sucursal  s  ON s.id_sucursal   = v.id_sucursal
      JOIN proveedor pr ON pr.id_proveedor = v.id_proveedor
      WHERE ${condiciones.join(' AND ')}
      ORDER BY v.fecha_vencimiento ASC NULLS LAST, v.id_lote ${limites}
    `;
    const { rows } = await pool.query(query, valores);
    return paginacion ? { datos: rows, paginacion } : rows;
  }

  async obtenerPorId(id_lote, client = pool) {
    const query = `
      SELECT
        v.*,
        p.nombre_comercial,
        p.nombre_generico,
        p.concentracion,
        pre.nombre AS presentacion,
        s.nombre_sucursal,
        pr.nombre AS proveedor_nombre
      FROM v_lote_estado v
      JOIN producto  p  ON p.id_producto   = v.id_producto
      JOIN presentacion pre ON pre.id_presentacion = p.id_presentacion
      JOIN sucursal  s  ON s.id_sucursal   = v.id_sucursal
      JOIN proveedor pr ON pr.id_proveedor = v.id_proveedor
      WHERE v.id_lote = $1
    `;
    const { rows } = await client.query(query, [id_lote]);
    return rows[0] || null;
  }

  async obtenerFilaPorId(id_lote, client = pool, bloquear = false) {
    const bloqueo = bloquear ? 'FOR UPDATE' : '';
    const { rows } = await client.query(
      `SELECT *
       FROM lote
       WHERE id_lote = $1
       ${bloqueo}`,
      [id_lote],
    );
    return rows[0] || null;
  }

  async fueUtilizado(id_lote, client = pool) {
    const { rows } = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM detalle_venta WHERE id_lote = $1
       ) AS utilizado`,
      [id_lote],
    );
    return Boolean(rows[0]?.utilizado);
  }

  // Busca si ya existe el mismo número de lote para ese producto y sucursal
  async obtenerPorNumeroLote(
    numero_lote,
    id_producto,
    id_sucursal,
    excluir_id = null,
    client = pool,
  ) {
    const query = `
      SELECT * FROM lote
      WHERE LOWER(numero_lote) = LOWER($1)
        AND id_producto  = $2
        AND id_sucursal  = $3
        AND ($4::INTEGER IS NULL OR id_lote != $4)
    `;
    const { rows } = await client.query(
      query,
      [numero_lote, id_producto, id_sucursal, excluir_id],
    );
    return rows[0] || null;
  }

  // UPDATE

  // Actualiza exclusivamente los campos recibidos y usa versionado optimista.
  async actualizar(id_lote, campos, client = pool) {
    const camposEditables = [
      'id_producto', 'id_proveedor', 'id_sucursal', 'numero_lote',
      'fecha_vencimiento', 'precio_compra', 'precio_venta',
      'margen_ganancia', 'precio_mayoreo', 'cantidad_mayoreo',
    ];
    const asignaciones = [];
    const valores = [];
    const agregar = (columna, valor) => {
      valores.push(valor);
      asignaciones.push(`${columna} = $${valores.length}`);
    };

    camposEditables.forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(campos, campo)) {
        agregar(campo, campos[campo]);
      }
    });
    if (campos.limpiar_mayoreo === true) {
      if (!asignaciones.some((item) => item.startsWith('precio_mayoreo ='))) {
        agregar('precio_mayoreo', null);
      }
      if (!asignaciones.some((item) => item.startsWith('cantidad_mayoreo ='))) {
        agregar('cantidad_mayoreo', null);
      }
    }

    asignaciones.push('version = version + 1');
    valores.push(id_lote);
    const indiceId = valores.length;
    const usaVersion = Number.isInteger(Number(campos.version));
    if (usaVersion) valores.push(Number(campos.version));

    const { rows } = await client.query(
      `UPDATE lote
       SET ${asignaciones.join(', ')}
       WHERE id_lote = $${indiceId}
         ${usaVersion ? `AND version = $${valores.length}` : ''}
       RETURNING *`,
      valores,
    );
    return rows[0] || null;
  }

  async ajustarStock(
    id_lote,
    { version, stock_esperado, cantidad_ajuste },
    client = pool,
  ) {
    const { rows } = await client.query(
      `UPDATE lote
       SET stock_actual = stock_actual + $1,
           version = version + 1
       WHERE id_lote = $2
         AND version = $3
         AND stock_actual = $4
         AND stock_actual + $1 >= 0
       RETURNING *`,
      [cantidad_ajuste, id_lote, version, stock_esperado],
    );
    return rows[0] || null;
  }

  // DELETE

  async eliminar(id_lote, client = pool) {
    const { rows } = await client.query(
      'DELETE FROM lote WHERE id_lote = $1 RETURNING *',
      [id_lote],
    );
    return rows[0] || null;
  }

  // Decrementa el stock_actual en una cantidad dada
  async decrementarStock(id_lote, cantidad, client = pool) {
    const query = `
      UPDATE lote
      SET stock_actual = stock_actual - $1,
          version = version + 1
      WHERE id_lote = $2
        AND stock_actual >= $1
      RETURNING *
    `;
    const { rows } = await client.query(query, [cantidad, id_lote]);
    return rows[0] || null;  // null si no había suficiente stock
  }

  // ALERTAS

  // Devuelve lotes con estado_vencimiento != 'normal' o estado_stock != 'normal'
  async obtenerAlertas(id_sucursal = null) {
    const condicionSucursal = id_sucursal ? 'AND v.id_sucursal = $1' : '';
    const valores           = id_sucursal ? [id_sucursal] : [];

    const query = `
      SELECT
        v.*,
        p.nombre_comercial,
        p.nombre_generico,
        p.concentracion,
        pre.nombre AS presentacion,
        s.nombre_sucursal,
        pr.nombre AS proveedor_nombre
      FROM v_lote_estado v
      JOIN producto  p  ON p.id_producto   = v.id_producto
      JOIN presentacion pre ON pre.id_presentacion = p.id_presentacion
      JOIN sucursal  s  ON s.id_sucursal   = v.id_sucursal
      JOIN proveedor pr ON pr.id_proveedor = v.id_proveedor
      WHERE (v.estado_vencimiento != 'normal' OR v.estado_stock != 'normal')
      ${condicionSucursal}
      ORDER BY
        CASE v.estado_vencimiento WHEN 'vencido' THEN 1 WHEN 'proximo_a_vencer' THEN 2 ELSE 3 END,
        CASE v.estado_stock       WHEN 'agotado'  THEN 1 WHEN 'poco_stock'       THEN 2 ELSE 3 END,
        v.fecha_vencimiento ASC NULLS LAST
    `;
    const { rows } = await pool.query(query, valores);
    return rows;
  }
}

module.exports = new LoteDAO();
