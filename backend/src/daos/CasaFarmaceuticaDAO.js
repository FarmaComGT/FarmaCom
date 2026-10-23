const pool = require('../database/db');

class CasaFarmaceuticaDAO {

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
      INSERT INTO casa_farmaceutica (nombre)
      VALUES ($1)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [nombre]);
    return rows[0];
  }

  // ─── OBTENER ────

  async obtenerTodos() {
    const query = `SELECT * FROM casa_farmaceutica ORDER BY id_casa`;
    const { rows } = await pool.query(query);
    return rows;
  }

  async obtenerPorId(id_casa) {
    const query = `SELECT * FROM casa_farmaceutica WHERE id_casa = $1`;
    const { rows } = await pool.query(query, [id_casa]);
    return rows[0] || null;
  }

  async obtenerPorNombre(nombre) {
    const query = `SELECT * FROM casa_farmaceutica WHERE LOWER(nombre) = LOWER($1)`;
    const { rows } = await pool.query(query, [nombre]);
    return rows[0] || null;
  }

  // ─── UPDATE ────

  async actualizar(id_casa, { nombre }) {
    const query = `
      UPDATE casa_farmaceutica
      SET nombre = COALESCE($1, nombre)
      WHERE id_casa = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [nombre ?? null, id_casa]);
    return rows[0] || null;
  }

  async cambiarActivo(id_casa, activo, client = pool) {
    const query = `
      UPDATE casa_farmaceutica
      SET activo = $1
      WHERE id_casa = $2
      RETURNING *
    `;
    const { rows } = await client.query(query, [activo, id_casa]);
    return rows[0] || null;
  }

  // ─── DELETE ────

  async eliminar(id_casa, client = pool) {
    const query = `DELETE FROM casa_farmaceutica WHERE id_casa = $1 RETURNING *`;
    const { rows } = await client.query(query, [id_casa]);
    return rows[0] || null;
  }

  async obtenerParaActualizar(id_casa, client = pool) {
    const query = `
      SELECT *
      FROM casa_farmaceutica
      WHERE id_casa = $1
      FOR UPDATE
    `;
    const { rows } = await client.query(query, [id_casa]);
    return rows[0] || null;
  }

  async obtenerUso(id_casa, client = pool) {
    const query = `
      SELECT
        (SELECT COUNT(*)::INTEGER
         FROM producto p
         WHERE p.id_casa = $1) AS productos,
        (SELECT COUNT(*)::INTEGER
         FROM lote l
         JOIN producto p ON p.id_producto = l.id_producto
         WHERE p.id_casa = $1) AS lotes,
        (SELECT COUNT(DISTINCT l.id_sucursal)::INTEGER
         FROM lote l
         JOIN producto p ON p.id_producto = l.id_producto
         WHERE p.id_casa = $1) AS sucursales
    `;
    const { rows } = await client.query(query, [id_casa]);
    return rows[0];
  }

  // ─── RELACIONES ────

  async obtenerProveedoresVinculados(id_casa) {
    const query = `
      SELECT p.id_proveedor, p.nombre, p.activo
      FROM proveedor p
      JOIN casa_proveedor cp ON cp.id_proveedor = p.id_proveedor
      WHERE cp.id_casa = $1
      ORDER BY p.nombre ASC
    `;
    const { rows } = await pool.query(query, [id_casa]);
    return rows;
  }
}

module.exports = new CasaFarmaceuticaDAO();
