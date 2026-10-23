const pool = require('../database/db');

class ProveedorDAO {

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

  // ─── CREATE ────

  async crear({ nombre }) {
    const query = `
      INSERT INTO proveedor (nombre)
      VALUES ($1)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [nombre]);
    return rows[0];
  }

  // ─── OBTENER ────

  async obtenerTodos() {
    const query = `SELECT * FROM proveedor ORDER BY id_proveedor`;
    const { rows } = await pool.query(query);
    return rows;
  }

  async obtenerPorId(id_proveedor, client = pool) {
    const query = `SELECT * FROM proveedor WHERE id_proveedor = $1`;
    const { rows } = await client.query(query, [id_proveedor]);
    return rows[0] || null;
  }

  async obtenerPorNombre(nombre) {
    const query = `SELECT * FROM proveedor WHERE LOWER(nombre) = LOWER($1)`;
    const { rows } = await pool.query(query, [nombre]);
    return rows[0] || null;
  }

  // ─── UPDATE ────

  async actualizar(id_proveedor, { nombre }) {
    const query = `
      UPDATE proveedor
      SET nombre = COALESCE($1, nombre)
      WHERE id_proveedor = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [nombre ?? null, id_proveedor]);
    return rows[0] || null;
  }

  async cambiarActivo(id_proveedor, activo, client = pool) {
    const query = `
      UPDATE proveedor
      SET activo = $1
      WHERE id_proveedor = $2
      RETURNING *
    `;
    const { rows } = await client.query(query, [activo, id_proveedor]);
    return rows[0] || null;
  }

  // ─── DELETE ────

  async eliminar(id_proveedor, client = pool) {
    const query = `DELETE FROM proveedor WHERE id_proveedor = $1 RETURNING *`;
    const { rows } = await client.query(query, [id_proveedor]);
    return rows[0] || null;
  }

  async obtenerParaActualizar(id_proveedor, client = pool) {
    const query = `
      SELECT *
      FROM proveedor
      WHERE id_proveedor = $1
      FOR UPDATE
    `;
    const { rows } = await client.query(query, [id_proveedor]);
    return rows[0] || null;
  }

  async obtenerUso(id_proveedor, client = pool) {
    const query = `
      SELECT
        (SELECT COUNT(*)::INTEGER
         FROM producto p
         WHERE p.id_proveedor = $1) AS productos,
        (SELECT COUNT(*)::INTEGER
         FROM lote l
         WHERE l.id_proveedor = $1) AS lotes,
        (SELECT COUNT(DISTINCT l.id_sucursal)::INTEGER
         FROM lote l
         WHERE l.id_proveedor = $1) AS sucursales
    `;
    const { rows } = await client.query(query, [id_proveedor]);
    return rows[0];
  }
}

module.exports = new ProveedorDAO();
