const pool = require('../database/db');

const solicitar = async (idUsuario, idReporte, destinatario) => {
  const { rows } = await pool.query(`INSERT INTO resumen_diario_envio (id_reporte, destinatario)
    SELECT id_reporte, $3 FROM resumen_diario_reporte WHERE id_usuario = $1 AND id_reporte = $2
    ON CONFLICT (id_reporte, canal) DO UPDATE SET id_reporte = EXCLUDED.id_reporte
    RETURNING id_envio, id_reporte, canal, destinatario, estado, intentos, solicitado_en`,
  [idUsuario, idReporte, destinatario]);
  return rows[0] || null;
};
const listar = async (idUsuario, idReporte) => {
  const { rows } = await pool.query(`SELECT e.id_envio, e.id_reporte, e.canal, e.destinatario,
    e.estado, e.intentos, e.solicitado_en, e.iniciado_en, e.finalizado_en, e.error
    FROM resumen_diario_envio e JOIN resumen_diario_reporte r USING (id_reporte)
    WHERE r.id_usuario = $1 AND r.id_reporte = $2 ORDER BY e.id_envio DESC`, [idUsuario, idReporte]);
  return rows;
};
const reclamar = async () => {
  // La selección y el cambio de estado son atómicos incluso con varios procesos.
  const { rows } = await pool.query(`WITH siguiente AS (
    SELECT e.id_envio FROM resumen_diario_envio e
    JOIN resumen_diario_reporte r USING (id_reporte)
    JOIN usuario u ON u.id_usuario = r.id_usuario
    WHERE e.estado = 'pendiente' AND u.estado_usuario = 'activo' AND u.rol = 'dueno'
    ORDER BY e.id_envio LIMIT 1 FOR UPDATE OF e SKIP LOCKED
  ), actualizado AS (
    UPDATE resumen_diario_envio e SET estado = 'procesando', iniciado_en = CURRENT_TIMESTAMP,
      intentos = intentos + 1 FROM siguiente s WHERE e.id_envio = s.id_envio RETURNING e.*
  ) SELECT a.*, r.datos FROM actualizado a JOIN resumen_diario_reporte r USING (id_reporte)`);
  return rows[0] || null;
};
const finalizar = async (idEnvio, estado, mensajeId, error) => pool.query(`
  UPDATE resumen_diario_envio SET estado = $2, mensaje_id = $3, error = $4,
    finalizado_en = CURRENT_TIMESTAMP WHERE id_envio = $1 AND estado = 'procesando'`,
[idEnvio, estado, mensajeId || null, error || null]);

// No reenviar a ciegas: SMTP pudo aceptar el mensaje antes de un reinicio.
const marcarInterrumpidos = () => pool.query(`UPDATE resumen_diario_envio
  SET estado = 'incierto', finalizado_en = CURRENT_TIMESTAMP,
    error = 'El procesamiento se interrumpió; verifica el buzón antes de reenviar.'
  WHERE estado = 'procesando' AND iniciado_en < CURRENT_TIMESTAMP - INTERVAL '10 minutes'`);

module.exports = { solicitar, listar, reclamar, finalizar, marcarInterrumpidos };
