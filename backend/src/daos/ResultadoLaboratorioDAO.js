const pool = require('../database/db');

class ResultadoLaboratorioDAO {
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

  async obtenerExpedientePorPaciente(id_paciente, client = pool) {
    const { rows } = await client.query(
      `SELECT e.id_expediente, p.id_laboratorio
       FROM expediente_laboratorio e
       JOIN paciente p ON p.id_paciente = e.id_paciente
       WHERE e.id_paciente = $1`,
      [id_paciente],
    );
    return rows[0] || null;
  }

  async crear({
    id_expediente,
    categoria,
    ruta_archivo,
    token_publico,
    fecha_expiracion,
    id_usuario_subida,
  }, client) {
    const { rows } = await client.query(
      `INSERT INTO resultado_laboratorio (
         id_expediente, categoria, ruta_archivo, token_publico,
         fecha_expiracion, id_usuario_subida
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_expediente, categoria, ruta_archivo, token_publico, fecha_expiracion, id_usuario_subida],
    );
    return rows[0];
  }

  async registrarBitacora({ id_usuario, entidad, id_entidad, accion, valores_nuevos = null, valores_anteriores = null }, client) {
    await client.query(
      `INSERT INTO bitacora_laboratorio (
         id_usuario, entidad, id_entidad, accion, valores_anteriores, valores_nuevos
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id_usuario, entidad, id_entidad, accion, valores_anteriores, valores_nuevos],
    );
  }

  async obtenerPorId(id_resultado, client = pool) {
    const { rows } = await client.query(
      `SELECT * FROM resultado_laboratorio WHERE id_resultado = $1`,
      [id_resultado],
    );
    return rows[0] || null;
  }

  async obtenerParaActualizar(id_resultado, client) {
    const { rows } = await client.query(
      `SELECT * FROM resultado_laboratorio WHERE id_resultado = $1 FOR UPDATE`,
      [id_resultado],
    );
    return rows[0] || null;
  }

  async obtenerPorToken(token_publico) {
    const { rows } = await pool.query(
      `SELECT * FROM resultado_laboratorio WHERE token_publico = $1`,
      [token_publico],
    );
    return rows[0] || null;
  }

  async listarPorPaciente(id_paciente) {
    const { rows } = await pool.query(
      `SELECT r.*
       FROM resultado_laboratorio r
       JOIN expediente_laboratorio e ON e.id_expediente = r.id_expediente
       WHERE e.id_paciente = $1
       ORDER BY r.fecha_subida DESC`,
      [id_paciente],
    );
    return rows;
  }

  async anular(id_resultado, motivo_anulacion, client) {
    const { rows } = await client.query(
      `UPDATE resultado_laboratorio
       SET estado = 'anulado',
           motivo_anulacion = $1,
           fecha_anulacion = CURRENT_TIMESTAMP
       WHERE id_resultado = $2
       RETURNING *`,
      [motivo_anulacion, id_resultado],
    );
    return rows[0] || null;
  }

  async obtenerCategoriasSugeridas(id_laboratorio) {
    const { rows } = await pool.query(
      `SELECT DISTINCT r.categoria
       FROM resultado_laboratorio r
       JOIN expediente_laboratorio e ON e.id_expediente = r.id_expediente
       JOIN paciente p ON p.id_paciente = e.id_paciente
       WHERE p.id_laboratorio = $1
       ORDER BY r.categoria ASC`,
      [id_laboratorio],
    );
    return rows.map((fila) => fila.categoria);
  }
}

module.exports = new ResultadoLaboratorioDAO();
