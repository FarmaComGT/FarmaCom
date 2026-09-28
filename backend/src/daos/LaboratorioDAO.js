const pool = require('../database/db');

class LaboratorioDAO {
  async listarActivos() {
    const { rows } = await pool.query(
      `SELECT id_laboratorio, id_ciudad, nombre_laboratorio, direccion
       FROM laboratorio
       WHERE activo = TRUE
       ORDER BY nombre_laboratorio ASC`,
    );
    return rows;
  }

  async obtenerPorId(id_laboratorio) {
    const { rows } = await pool.query(
      `SELECT id_laboratorio, id_ciudad, nombre_laboratorio, direccion, activo
       FROM laboratorio
       WHERE id_laboratorio = $1`,
      [id_laboratorio],
    );
    return rows[0] || null;
  }

  async obtenerPorNombre(nombre_laboratorio) {
    const { rows } = await pool.query(
      `SELECT id_laboratorio
       FROM laboratorio
       WHERE LOWER(nombre_laboratorio) = LOWER($1)`,
      [nombre_laboratorio],
    );
    return rows[0] || null;
  }

  async crear({ id_ciudad, nombre_laboratorio, direccion }) {
    const { rows } = await pool.query(
      `INSERT INTO laboratorio (id_ciudad, nombre_laboratorio, direccion)
       VALUES ($1, $2, $3)
       RETURNING id_laboratorio, id_ciudad, nombre_laboratorio, direccion, activo`,
      [id_ciudad, nombre_laboratorio, direccion],
    );
    return rows[0];
  }

  async actualizar(id_laboratorio, { id_ciudad, nombre_laboratorio, direccion }) {
    const { rows } = await pool.query(
      `UPDATE laboratorio
       SET id_ciudad = $1, nombre_laboratorio = $2, direccion = $3
       WHERE id_laboratorio = $4 AND activo = TRUE
       RETURNING id_laboratorio, id_ciudad, nombre_laboratorio, direccion, activo`,
      [id_ciudad, nombre_laboratorio, direccion, id_laboratorio],
    );
    return rows[0] || null;
  }
}

module.exports = new LaboratorioDAO();
