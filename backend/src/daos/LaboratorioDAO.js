const pool = require('../database/db');

class LaboratorioDAO {
  async listarActivos() {
    const { rows } = await pool.query(
      `SELECT id_laboratorio, nombre_laboratorio, direccion
       FROM laboratorio
       WHERE activo = TRUE
       ORDER BY nombre_laboratorio ASC`,
    );
    return rows;
  }
}

module.exports = new LaboratorioDAO();
