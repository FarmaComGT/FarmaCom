const pool = require('../database/db');

class MovimientoInventarioDAO {
  async registrar({
    id_lote,
    tipo,
    cantidad_anterior,
    cantidad_nueva,
    id_usuario,
    id_sucursal,
    motivo,
    referencia,
  }, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO movimiento_inventario (
         id_lote, tipo, cantidad_anterior, cantidad_nueva,
         id_usuario, id_sucursal, motivo, referencia
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id_lote,
        tipo,
        cantidad_anterior,
        cantidad_nueva,
        id_usuario,
        id_sucursal,
        motivo,
        referencia ?? null,
      ],
    );
    return rows[0];
  }

  async obtenerPorLote(id_lote, client = pool) {
    const { rows } = await client.query(
      `SELECT
         mi.*,
         u.nombre_usuario,
         s.nombre_sucursal
       FROM movimiento_inventario mi
       JOIN usuario u ON u.id_usuario = mi.id_usuario
       JOIN sucursal s ON s.id_sucursal = mi.id_sucursal
       WHERE mi.id_lote = $1
       ORDER BY mi.fecha_movimiento DESC, mi.id_movimiento DESC`,
      [id_lote],
    );
    return rows;
  }
}

module.exports = new MovimientoInventarioDAO();
