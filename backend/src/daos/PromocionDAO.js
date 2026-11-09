const pool = require('../database/db');
const { ejecutarConsultaPaginada } = require('../utils/paginacion');

class PromocionDAO {

  async obtenerTodas({ pagina = 1, limite = 25, busqueda, id_producto, id_sucursal, estado } = {}) {
    const valores = [];
    const condiciones = [];
    const agregar = (valor) => { valores.push(valor); return `$${valores.length}`; };
    if (id_producto) condiciones.push(`pr.id_producto = ${agregar(id_producto)}`);
    if (id_sucursal) condiciones.push(`pr.id_sucursal = ${agregar(id_sucursal)}`);
    if (busqueda) {
      const parametro = agregar(busqueda);
      const patron = `('%' || normalizar_texto_busqueda(${parametro}) || '%')`;
      condiciones.push(`(normalizar_texto_busqueda(${parametro}) <> '' AND (
        normalizar_texto_busqueda(pr.nombre) LIKE ${patron} OR normalizar_texto_busqueda(p.nombre_comercial) LIKE ${patron}
        OR normalizar_texto_busqueda(p.nombre_generico) LIKE ${patron} OR normalizar_texto_busqueda(p.codigo) LIKE ${patron}))`);
    }
    const estados = {
      vigente: 'pr.activo AND pr.fecha_inicio <= CURRENT_DATE AND (pr.fecha_fin IS NULL OR pr.fecha_fin >= CURRENT_DATE) AND (pr.cantidad_disponible IS NULL OR pr.cantidad_disponible > 0)',
      agotada: 'pr.activo AND pr.fecha_inicio <= CURRENT_DATE AND (pr.fecha_fin IS NULL OR pr.fecha_fin >= CURRENT_DATE) AND pr.cantidad_disponible = 0',
      programada: 'pr.activo AND pr.fecha_inicio > CURRENT_DATE',
      finalizada: 'pr.activo AND pr.fecha_fin < CURRENT_DATE',
      desactivada: 'NOT pr.activo',
    };
    if (estados[estado]) condiciones.push(estados[estado]);
    return ejecutarConsultaPaginada({ cliente: pool, valores, pagina, limite,
      consultaBase: `SELECT pr.*, s.nombre_sucursal, p.nombre_comercial, p.nombre_generico,
        p.codigo, p.concentracion, pre.nombre AS presentacion
        FROM v_promocion_cupo pr JOIN sucursal s USING (id_sucursal)
        JOIN producto p USING (id_producto) JOIN presentacion pre USING (id_presentacion)
        ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}`,
      orden: 'ORDER BY pr.fecha_inicio DESC, pr.id_promocion DESC' });
  }

  async crear({ id_producto, id_sucursal, cantidad_minima, precio_promocion, fecha_inicio, fecha_fin, nombre, cantidad_maxima = null }) {
    const query = `
      WITH creada AS (
        INSERT INTO promocion (
          id_producto, id_sucursal,
          cantidad_minima, precio_promocion,
          fecha_inicio, fecha_fin, nombre, cantidad_maxima
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      )
      SELECT creada.*, s.nombre_sucursal
      FROM creada
      JOIN sucursal s ON s.id_sucursal = creada.id_sucursal
    `;
    const valores = [
      id_producto,
      id_sucursal,
      cantidad_minima,
      precio_promocion,
      fecha_inicio,
      fecha_fin ?? null,
      nombre || null,
      cantidad_maxima,
    ];
    const { rows } = await pool.query(query, valores);
    return rows[0];
  }

  async obtenerPorProducto(id_producto, { pagina, limite, id_sucursal } = {}) {
    const valores = [id_producto];
    let filtroSucursal = '';
    if (id_sucursal) {
      valores.push(id_sucursal);
      filtroSucursal = ` AND pr.id_sucursal = $${valores.length}`;
    }
    const base = `
      SELECT
        pr.*,
        s.nombre_sucursal
      FROM v_promocion_cupo pr
      JOIN sucursal s ON s.id_sucursal = pr.id_sucursal
      WHERE pr.id_producto = $1
      ${filtroSucursal}
    `;
    if (pagina !== undefined) {
      return ejecutarConsultaPaginada({ cliente: pool, consultaBase: base, valores,
        orden: 'ORDER BY pr.fecha_inicio DESC, pr.id_promocion DESC', pagina, limite });
    }
    const { rows } = await pool.query(
      `${base} ORDER BY pr.fecha_inicio DESC, pr.id_promocion DESC`, valores,
    );
    return rows;
  }

  async obtenerPorId(id_promocion) {
    const query = `
      SELECT
        pr.*,
        s.nombre_sucursal, p.nombre_comercial, p.codigo, p.concentracion, pre.nombre AS presentacion
      FROM v_promocion_cupo pr
      JOIN sucursal s ON s.id_sucursal = pr.id_sucursal
      JOIN producto p ON p.id_producto = pr.id_producto
      JOIN presentacion pre ON pre.id_presentacion = p.id_presentacion
      WHERE pr.id_promocion = $1
    `;
    const { rows } = await pool.query(query, [id_promocion]);
    return rows[0] || null;
  }

  async obtenerPrecioVentaMinimoDisponible(id_producto, id_sucursal, client = pool) {
    const { rows } = await client.query(
      `SELECT MIN(precio_venta) AS precio_venta_minimo
       FROM lote
       WHERE id_producto = $1
         AND id_sucursal = $2
         AND stock_actual > 0
         AND precio_venta > 0
         AND (
           fecha_vencimiento IS NULL
           OR fecha_vencimiento >= CURRENT_DATE
         )`,
      [id_producto, id_sucursal],
    );
    return rows[0]?.precio_venta_minimo ?? null;
  }

  async obtenerVigentesParaVenta(idsProducto, idSucursal, client = pool, idPagoPOS = null) {
    if (!idsProducto.length) return [];

    // Bloquear primero y leer el saldo después: la segunda consulta ve el uso
    // confirmado por otra caja mientras esta transacción esperaba el bloqueo.
    const { rows: bloqueadas } = await client.query(
      `SELECT
         id_promocion,
         id_producto,
         id_sucursal,
         cantidad_minima,
         precio_promocion,
         fecha_inicio,
         fecha_fin
       FROM promocion
       WHERE id_producto = ANY($1::int[])
         AND id_sucursal = $2
         AND activo = TRUE
         AND CURRENT_DATE >= fecha_inicio AND (fecha_fin IS NULL OR CURRENT_DATE <= fecha_fin)
       ORDER BY id_producto, precio_promocion, id_promocion
       FOR UPDATE`,
      [idsProducto, idSucursal],
    );
    if (!bloqueadas.length) return [];
    const { rows } = await client.query(
      `SELECT pr.*, CASE WHEN $2::int IS NOT NULL THEN
         COALESCE((SELECT SUM(cantidad) FROM promocion_uso
           WHERE id_promocion = pr.id_promocion AND id_pago_pos = $2 AND estado = 'reservada'), 0)
         ELSE pr.cantidad_disponible
         END AS cantidad_disponible
       FROM v_promocion_cupo pr WHERE id_promocion = ANY($1::int[])
       ORDER BY id_producto, precio_promocion, id_promocion`,
      [bloqueadas.map((p) => p.id_promocion), idPagoPOS],
    );
    return rows;
  }

  // Verifica si ya existe una promoción activa para el mismo producto + sucursal
  async existeActivaSolapada({ id_producto, id_sucursal, fecha_inicio, fecha_fin, excluir_id = null }) {
    const query = `
      SELECT id_promocion, nombre, cantidad_minima FROM promocion
      WHERE id_producto  = $1
        AND id_sucursal  = $2
        AND activo       = true
        AND fecha_inicio <= COALESCE($4::date, 'infinity'::date)
        AND (fecha_fin IS NULL OR fecha_fin >= $3)
        ${excluir_id ? 'AND id_promocion <> $5' : ''}
      LIMIT 1
    `;
    const valores = excluir_id
      ? [id_producto, id_sucursal, fecha_inicio, fecha_fin, excluir_id]
      : [id_producto, id_sucursal, fecha_inicio, fecha_fin];
    const { rows } = await pool.query(query, valores);
    return rows[0] || null;
  }

  async actualizar(id_promocion, campos) {
    const permitidos = ['nombre', 'cantidad_minima', 'precio_promocion', 'fecha_inicio', 'fecha_fin', 'cantidad_maxima'];
    const entradas = Object.entries(campos).filter(([campo]) => permitidos.includes(campo));
    const valores = entradas.map(([, valor]) => valor);
    valores.push(id_promocion);
    const actualizar = async (client) => {
      const { rows } = await client.query(
      `UPDATE promocion SET ${entradas.map(([campo], i) => `${campo} = $${i + 1}`).join(', ')}
       WHERE id_promocion = $${valores.length}
       ${Object.hasOwn(campos, 'cantidad_maxima') ? `AND ($${entradas.findIndex(([c]) => c === 'cantidad_maxima') + 1}::int IS NULL OR $${entradas.findIndex(([c]) => c === 'cantidad_maxima') + 1} >= (SELECT COALESCE(SUM(cantidad), 0) FROM promocion_uso WHERE id_promocion = promocion.id_promocion AND estado <> 'liberada'))` : ''}
       RETURNING *`, valores,
      );
      return rows[0] || null;
    };
    if (!Object.hasOwn(campos, 'cantidad_maxima')) return actualizar(pool);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id_promocion FROM promocion WHERE id_promocion = $1 FOR UPDATE', [id_promocion]);
      const resultado = await actualizar(client);
      await client.query('COMMIT');
      return resultado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async registrarUso(detalles, { id_venta = null, id_pago_pos = null }, client) {
    const cantidades = new Map();
    for (const detalle of detalles) {
      if (detalle.id_promocion) cantidades.set(Number(detalle.id_promocion),
        (cantidades.get(Number(detalle.id_promocion)) || 0) + Number(detalle.cantidad));
    }
    for (const [id, cantidad] of [...cantidades].sort(([a], [b]) => a - b)) {
      await client.query(`INSERT INTO promocion_uso (id_promocion, id_venta, id_pago_pos, cantidad, estado)
        VALUES ($1, $2, $3, $4, $5)`, [id, id_venta, id_pago_pos, cantidad, id_venta ? 'confirmada' : 'reservada']);
    }
  }

  async liberarUso({ id_venta = null, id_pago_pos = null }, client) {
    await client.query(`UPDATE promocion_uso SET estado = 'liberada'
      WHERE estado <> 'liberada' AND (($1::int IS NOT NULL AND id_venta = $1)
        OR ($2::int IS NOT NULL AND id_pago_pos = $2))`, [id_venta, id_pago_pos]);
  }

  // Cancelación manual antes de fecha_fin
  async cambiarActivo(id_promocion, activo) {
    const { rows } = await pool.query(
      `UPDATE promocion SET activo = $1 WHERE id_promocion = $2 RETURNING *`,
      [activo, id_promocion],
    );
    return rows[0] || null;
  }

  // Permitido según decisión de negocio
  async eliminar(id_promocion) {
    const { rows } = await pool.query(
      `DELETE FROM promocion WHERE id_promocion = $1 RETURNING *`,
      [id_promocion],
    );
    return rows[0] || null;
  }
}

module.exports = new PromocionDAO();
