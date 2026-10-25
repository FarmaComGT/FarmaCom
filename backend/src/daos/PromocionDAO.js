const pool = require('../database/db');

class PromocionDAO {

  async crear({ id_producto, id_sucursal, cantidad_minima, precio_promocion, fecha_inicio, fecha_fin }) {
    const query = `
      WITH creada AS (
        INSERT INTO promocion (
          id_producto, id_sucursal,
          cantidad_minima, precio_promocion,
          fecha_inicio, fecha_fin
        )
        VALUES ($1, $2, $3, $4, $5, $6)
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
      fecha_fin,
    ];
    const { rows } = await pool.query(query, valores);
    return rows[0];
  }

  async obtenerPorProducto(id_producto) {
    const query = `
      SELECT
        pr.*,
        s.nombre_sucursal
      FROM promocion pr
      JOIN sucursal s ON s.id_sucursal = pr.id_sucursal
      WHERE pr.id_producto = $1
      ORDER BY pr.fecha_inicio DESC
    `;
    const { rows } = await pool.query(query, [id_producto]);
    return rows;
  }

  async obtenerPorId(id_promocion) {
    const query = `
      SELECT
        pr.*,
        s.nombre_sucursal
      FROM promocion pr
      JOIN sucursal s ON s.id_sucursal = pr.id_sucursal
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

  async obtenerVigentesParaVenta(idsProducto, idSucursal, client = pool) {
    if (!idsProducto.length) return [];

    const { rows } = await client.query(
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
         AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
       ORDER BY id_producto, precio_promocion, id_promocion
       FOR SHARE`,
      [idsProducto, idSucursal],
    );
    return rows;
  }

  // Verifica si ya existe una promoción activa para el mismo producto + sucursal
  async existeActivaSolapada({ id_producto, id_sucursal, fecha_inicio, fecha_fin, excluir_id = null }) {
    const query = `
      SELECT 1 FROM promocion
      WHERE id_producto  = $1
        AND id_sucursal  = $2
        AND activo       = true
        AND fecha_inicio <= $4
        AND fecha_fin    >= $3
        ${excluir_id ? 'AND id_promocion <> $5' : ''}
      LIMIT 1
    `;
    const valores = excluir_id
      ? [id_producto, id_sucursal, fecha_inicio, fecha_fin, excluir_id]
      : [id_producto, id_sucursal, fecha_inicio, fecha_fin];
    const { rows } = await pool.query(query, valores);
    return rows.length > 0;
  }

  async actualizar(id_promocion, campos) {
    const { cantidad_minima, precio_promocion, fecha_inicio, fecha_fin } = campos;
    const query = `
      UPDATE promocion SET
        cantidad_minima  = COALESCE($1, cantidad_minima),
        precio_promocion = COALESCE($2, precio_promocion),
        fecha_inicio     = COALESCE($3, fecha_inicio),
        fecha_fin        = COALESCE($4, fecha_fin)
      WHERE id_promocion = $5
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      cantidad_minima  ?? null,
      precio_promocion ?? null,
      fecha_inicio     ?? null,
      fecha_fin        ?? null,
      id_promocion,
    ]);
    return rows[0] || null;
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
