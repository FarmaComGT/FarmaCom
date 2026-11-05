const pool = require('../database/db');

const generarSiguiente = async (generarDatos) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Bloquea una configuración, no todo el planificador. Otras instancias saltan
    // este dueño; la copia y su trabajo se confirman en la misma transacción.
    const { rows } = await client.query(`SELECT c.id_usuario, c.correo_destinatario,
      c.todas_sucursales, dia::date::text AS fecha,
      (dia::date + c.hora_envio) AT TIME ZONE 'America/Guatemala' AS previsto_para,
      COALESCE((SELECT json_agg(s.id_sucursal ORDER BY s.id_sucursal)
        FROM resumen_diario_sucursal s WHERE s.id_usuario = c.id_usuario), '[]'::json) AS sucursales
      FROM resumen_diario_configuracion c JOIN usuario u USING (id_usuario)
      CROSS JOIN LATERAL generate_series(
        (c.programacion_desde AT TIME ZONE 'America/Guatemala')::date::timestamp,
        (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::date::timestamp,
        INTERVAL '1 day') AS dias(dia)
      WHERE c.automatico AND c.correo_destinatario <> ''
        AND u.rol = 'dueno' AND u.estado_usuario = 'activo'
        AND ((dia::date + c.hora_envio) AT TIME ZONE 'America/Guatemala') >= c.programacion_desde
        AND ((dia::date + c.hora_envio) AT TIME ZONE 'America/Guatemala') <= CURRENT_TIMESTAMP
        AND NOT EXISTS (SELECT 1 FROM resumen_diario_reporte r
          WHERE r.id_usuario = c.id_usuario AND r.fecha = dia::date AND r.origen = 'automatico')
      ORDER BY previsto_para, c.id_usuario LIMIT 1 FOR UPDATE OF c SKIP LOCKED`);
    const configuracion = rows[0];
    if (!configuracion) { await client.query('COMMIT'); return null; }
    const datos = await generarDatos(configuracion, client);
    const { rows: reportes } = await client.query(`INSERT INTO resumen_diario_reporte
      (id_usuario, fecha, corte, estado, datos, origen) VALUES ($1, $2, $3, $4, $5::jsonb, 'automatico')
      RETURNING id_reporte`, [configuracion.id_usuario, datos.fecha, datos.corte, datos.estado, JSON.stringify(datos)]);
    await client.query(`INSERT INTO resumen_diario_envio (id_reporte, destinatario)
      VALUES ($1, $2)`, [reportes[0].id_reporte, configuracion.correo_destinatario]);
    await client.query('COMMIT');
    return reportes[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
};

module.exports = { generarSiguiente };
