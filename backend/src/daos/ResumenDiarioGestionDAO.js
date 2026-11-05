const pool = require('../database/db');
const AppError = require('../errors/AppError');

const obtenerConfiguracion = async (idUsuario) => {
  const { rows } = await pool.query(`
    SELECT c.correo_destinatario, LEFT(c.hora_envio::text, 5) AS hora_envio,
      c.automatico, c.todas_sucursales, c.actualizado_en, c.programacion_desde,
      COALESCE((SELECT json_agg(s.id_sucursal ORDER BY s.id_sucursal)
        FROM resumen_diario_sucursal s WHERE s.id_usuario = c.id_usuario), '[]'::json) AS sucursales
    FROM resumen_diario_configuracion c WHERE c.id_usuario = $1`, [idUsuario]);
  return rows[0] || null;
};

const guardarConfiguracion = async (idUsuario, config) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // El UPSERT serializa cambios simultáneos del mismo dueño antes de cambiar la selección.
    await client.query(`INSERT INTO resumen_diario_configuracion
      (id_usuario, correo_destinatario, hora_envio, automatico, todas_sucursales)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id_usuario) DO UPDATE SET correo_destinatario = EXCLUDED.correo_destinatario,
        hora_envio = EXCLUDED.hora_envio, automatico = EXCLUDED.automatico,
        todas_sucursales = EXCLUDED.todas_sucursales, actualizado_en = CURRENT_TIMESTAMP,
        programacion_desde = CURRENT_TIMESTAMP`,
    [idUsuario, config.correo_destinatario, config.hora_envio, config.automatico, config.todas_sucursales]);
    if (!config.todas_sucursales) {
      const { rowCount } = await client.query(
        'SELECT id_sucursal FROM sucursal WHERE id_sucursal = ANY($1::integer[]) FOR KEY SHARE',
        [config.sucursales],
      );
      if (rowCount !== config.sucursales.length) throw new AppError('Una o más sucursales no existen', 400);
    }
    await client.query('DELETE FROM resumen_diario_sucursal WHERE id_usuario = $1', [idUsuario]);
    if (config.sucursales.length) {
      await client.query(`INSERT INTO resumen_diario_sucursal (id_usuario, id_sucursal)
        SELECT $1, unnest($2::integer[])`, [idUsuario, config.sucursales]);
    }
    await client.query('COMMIT');
    return config;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
};

const guardarReporte = async (idUsuario, datos) => {
  const { rows } = await pool.query(`INSERT INTO resumen_diario_reporte
    (id_usuario, fecha, corte, estado, datos) VALUES ($1, $2, $3, $4, $5::jsonb)
    RETURNING id_reporte, origen, fecha::text, corte, estado, creado_en`,
  [idUsuario, datos.fecha, datos.corte, datos.estado, JSON.stringify(datos)]);
  return rows[0];
};

const listarReportes = async (idUsuario, pagina, limite) => {
  // El total y las filas corresponden a la misma vista de la base de datos.
  const { rows } = await pool.query(`WITH seleccion AS (
    SELECT id_reporte, origen, fecha::text, corte, estado, creado_en
    FROM resumen_diario_reporte WHERE id_usuario = $1
    ORDER BY id_reporte DESC LIMIT $2 OFFSET $3
  ) SELECT (SELECT COUNT(*)::integer FROM resumen_diario_reporte WHERE id_usuario = $1) AS total,
    COALESCE((SELECT json_agg(s ORDER BY s.id_reporte DESC) FROM seleccion s), '[]'::json) AS datos`,
  [idUsuario, limite, (pagina - 1) * limite]);
  return { datos: rows[0].datos, paginacion: { pagina, limite, total: rows[0].total } };
};

const obtenerReporte = async (idUsuario, idReporte) => {
  const { rows } = await pool.query(`SELECT id_reporte, origen, fecha::text, corte, estado, creado_en,
    datos FROM resumen_diario_reporte
    WHERE id_usuario = $1 AND id_reporte = $2`, [idUsuario, idReporte]);
  return rows[0] || null;
};

module.exports = { obtenerConfiguracion, guardarConfiguracion, guardarReporte, listarReportes, obtenerReporte };
