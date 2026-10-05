const pool = require('../database/db');

class BitacoraLaboratorioDAO {
  async crear({ id_usuario, entidad, id_entidad, accion, valores_anteriores, valores_nuevos }, client) {
    const { rows } = await client.query(
      `INSERT INTO bitacora_laboratorio
         (id_usuario, entidad, id_entidad, accion, valores_anteriores, valores_nuevos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_usuario, entidad, id_entidad, accion, valores_anteriores, valores_nuevos],
    );
    return rows[0];
  }

  async obtenerExpedientePorId(id_expediente) {
    const { rows } = await pool.query(
      `SELECT id_expediente, id_paciente
       FROM expediente_laboratorio
       WHERE id_expediente = $1`,
      [id_expediente],
    );
    return rows[0] || null;
  }

  async obtenerPorExpediente(id_expediente) {
    const { rows } = await pool.query(
      `SELECT
         b.id_bitacora,
         b.id_usuario,
         u.nombre_usuario,
         b.entidad,
         b.id_entidad,
         b.accion,
         b.valores_anteriores,
         b.valores_nuevos,
         b.fecha_hora
       FROM bitacora_laboratorio b
       JOIN usuario u ON u.id_usuario = b.id_usuario
       JOIN expediente_laboratorio e ON e.id_expediente = $1
       WHERE
         (b.entidad = 'expediente_laboratorio' AND b.id_entidad = e.id_expediente)
         OR (b.entidad = 'paciente' AND b.id_entidad = e.id_paciente)
         OR (
           b.entidad = 'resultado_laboratorio'
           AND EXISTS (
             SELECT 1
             FROM resultado_laboratorio r
             WHERE r.id_resultado = b.id_entidad
               AND r.id_expediente = e.id_expediente
           )
         )
         OR (
           b.entidad = 'visita_laboratorio'
           AND EXISTS (
             SELECT 1
             FROM visita_laboratorio v
             WHERE v.id_visita = b.id_entidad
               AND v.id_expediente = e.id_expediente
           )
         )
       ORDER BY b.fecha_hora DESC, b.id_bitacora DESC`,
      [id_expediente],
    );
    return rows;
  }
}

module.exports = new BitacoraLaboratorioDAO();
