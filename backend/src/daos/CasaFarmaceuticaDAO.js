const pool = require('../database/db');

class CasaFarmaceuticaDAO {

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

  async cambiarActivo(id_casa, activo) {
    const query = `
      UPDATE casa_farmaceutica
      SET activo = $1
      WHERE id_casa = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [activo, id_casa]);
    return rows[0] || null;
  }

  // ─── DELETE ────

  async eliminar(id_casa) {
    const query = `DELETE FROM casa_farmaceutica WHERE id_casa = $1 RETURNING *`;
    const { rows } = await pool.query(query, [id_casa]);
    return rows[0] || null;
  }
}

module.exports = new CasaFarmaceuticaDAO();