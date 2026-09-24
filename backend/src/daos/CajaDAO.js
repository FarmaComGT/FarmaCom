const pool = require('../database/db');

class CajaDAO {
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

  async crearCaja({ id_sucursal, nombre }) {
    const { rows } = await pool.query(
      `INSERT INTO caja (id_sucursal, nombre)
       VALUES ($1, $2)
       RETURNING *`,
      [id_sucursal, nombre],
    );
    return rows[0];
  }

  async obtenerCajaPorNombre(id_sucursal, nombre) {
    const { rows } = await pool.query(
      `SELECT *
       FROM caja
       WHERE id_sucursal = $1
         AND LOWER(nombre) = LOWER($2)`,
      [id_sucursal, nombre],
    );
    return rows[0] || null;
  }

  async obtenerCajaPorId(id_caja, client = pool, bloquear = false) {
    const bloqueo = bloquear ? 'FOR UPDATE OF c' : '';
    const { rows } = await client.query(
      `SELECT c.*, s.nombre_sucursal
       FROM caja c
       JOIN sucursal s ON s.id_sucursal = c.id_sucursal
       WHERE c.id_caja = $1
       ${bloqueo}`,
      [id_caja],
    );
    return rows[0] || null;
  }

  async obtenerCajas({ id_sucursal, activa } = {}) {
    const condiciones = [];
    const valores = [];

    if (id_sucursal) {
      valores.push(id_sucursal);
      condiciones.push(`c.id_sucursal = $${valores.length}`);
    }
    if (activa !== undefined) {
      valores.push(activa);
      condiciones.push(`c.activa = $${valores.length}`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT
         c.*,
         s.nombre_sucursal,
         sc.id_sesion_caja AS id_sesion_abierta,
         sc.turno,
         sc.fecha_hora_apertura,
         sc.id_usuario_apertura
       FROM caja c
       JOIN sucursal s ON s.id_sucursal = c.id_sucursal
       LEFT JOIN sesion_caja sc
         ON sc.id_caja = c.id_caja
        AND sc.estado = 'abierta'
       ${where}
       ORDER BY s.nombre_sucursal, c.nombre`,
      valores,
    );
    return rows;
  }

  async actualizarCaja(id_caja, { nombre, activa }) {
    const { rows } = await pool.query(
      `UPDATE caja
       SET nombre = COALESCE($1, nombre),
           activa = COALESCE($2, activa)
       WHERE id_caja = $3
       RETURNING *`,
      [nombre ?? null, activa ?? null, id_caja],
    );
    return rows[0] || null;
  }

  async crearSesion({
    id_caja,
    id_usuario_apertura,
    turno,
    fondo_inicial,
  }, client) {
    const { rows } = await client.query(
      `INSERT INTO sesion_caja (
         id_caja,
         id_usuario_apertura,
         turno,
         fondo_inicial
       )
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id_caja, id_usuario_apertura, turno, fondo_inicial],
    );
    return rows[0];
  }

  async obtenerSesionAbiertaPorCaja(id_caja, client = pool) {
    const { rows } = await client.query(
      `SELECT sc.*, c.id_sucursal, c.nombre AS nombre_caja, s.nombre_sucursal
       FROM sesion_caja sc
       JOIN caja c ON c.id_caja = sc.id_caja
       JOIN sucursal s ON s.id_sucursal = c.id_sucursal
       WHERE sc.id_caja = $1
         AND sc.estado = 'abierta'`,
      [id_caja],
    );
    return rows[0] || null;
  }

  async obtenerSesionPorId(id_sesion_caja, client = pool, bloqueo = null) {
    const clausulaBloqueo = bloqueo === 'update'
      ? 'FOR UPDATE OF sc'
      : bloqueo === 'share'
        ? 'FOR SHARE OF sc'
        : '';
    const { rows } = await client.query(
      `SELECT
         sc.*,
         c.id_sucursal,
         c.nombre AS nombre_caja,
         c.activa AS caja_activa,
         s.nombre_sucursal,
         ua.nombre_usuario AS usuario_apertura,
         uc.nombre_usuario AS usuario_cierre
       FROM sesion_caja sc
       JOIN caja c ON c.id_caja = sc.id_caja
       JOIN sucursal s ON s.id_sucursal = c.id_sucursal
       JOIN usuario ua ON ua.id_usuario = sc.id_usuario_apertura
       LEFT JOIN usuario uc ON uc.id_usuario = sc.id_usuario_cierre
       WHERE sc.id_sesion_caja = $1
       ${clausulaBloqueo}`,
      [id_sesion_caja],
    );
    return rows[0] || null;
  }

  async crearMovimiento({
    id_sesion_caja,
    id_usuario,
    tipo,
    monto,
    motivo,
  }, client) {
    const { rows } = await client.query(
      `INSERT INTO movimiento_caja (
         id_sesion_caja,
         id_usuario,
         tipo,
         monto,
         motivo
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_sesion_caja, id_usuario, tipo, monto, motivo],
    );
    return rows[0];
  }

  async obtenerTotalesSesion(id_sesion_caja, client = pool) {
    const [ventas, movimientos] = await Promise.all([
      client.query(
        `SELECT
           COALESCE(SUM(total) FILTER (
             WHERE estado = 'completada' AND metodo_pago = 'efectivo'
           ), 0)::NUMERIC(14,2) AS ventas_efectivo,
           COALESCE(SUM(total) FILTER (
             WHERE estado = 'completada' AND metodo_pago = 'tarjeta'
           ), 0)::NUMERIC(14,2) AS ventas_tarjeta,
           COUNT(*) FILTER (WHERE estado = 'completada')::INTEGER AS cantidad_ventas,
           COUNT(*) FILTER (WHERE estado = 'anulada')::INTEGER AS cantidad_anulaciones
         FROM venta
         WHERE id_sesion_caja = $1`,
        [id_sesion_caja],
      ),
      client.query(
        `SELECT
           COALESCE(SUM(monto) FILTER (WHERE tipo = 'entrada'), 0)::NUMERIC(14,2)
             AS total_entradas,
           COALESCE(SUM(monto) FILTER (WHERE tipo = 'salida'), 0)::NUMERIC(14,2)
             AS total_salidas
         FROM movimiento_caja
         WHERE id_sesion_caja = $1`,
        [id_sesion_caja],
      ),
    ]);

    return {
      ...ventas.rows[0],
      ...movimientos.rows[0],
    };
  }

  async contarPagosPOSPendientes(id_sesion_caja, client = pool) {
    const { rows } = await client.query(
      `SELECT COUNT(*)::INTEGER AS cantidad
       FROM pago_pos
       WHERE id_sesion_caja = $1
         AND estado IN ('pendiente', 'procesando')`,
      [id_sesion_caja],
    );
    return Number(rows[0]?.cantidad || 0);
  }

  async cerrarSesion(id_sesion_caja, datos, client) {
    const { rows } = await client.query(
      `UPDATE sesion_caja
       SET id_usuario_cierre = $1,
           fecha_hora_cierre = CURRENT_TIMESTAMP,
           total_ventas_efectivo = $2,
           total_ventas_tarjeta = $3,
           total_entradas = $4,
           total_salidas = $5,
           efectivo_esperado = $6,
           efectivo_contado = $7,
           diferencia_efectivo = $8,
           cantidad_ventas = $9,
           cantidad_anulaciones = $10,
           observaciones = $11,
           estado = 'cerrada'
       WHERE id_sesion_caja = $12
       RETURNING *`,
      [
        datos.id_usuario_cierre,
        datos.total_ventas_efectivo,
        datos.total_ventas_tarjeta,
        datos.total_entradas,
        datos.total_salidas,
        datos.efectivo_esperado,
        datos.efectivo_contado,
        datos.diferencia_efectivo,
        datos.cantidad_ventas,
        datos.cantidad_anulaciones,
        datos.observaciones ?? null,
        id_sesion_caja,
      ],
    );
    return rows[0];
  }

  async obtenerCierres({ id_sucursal, id_caja, fecha_desde, fecha_hasta } = {}) {
    const condiciones = ["sc.estado = 'cerrada'"];
    const valores = [];
    const agregar = (condicion, valor) => {
      valores.push(valor);
      condiciones.push(condicion.replace('?', `$${valores.length}`));
    };

    if (id_sucursal) agregar('c.id_sucursal = ?', id_sucursal);
    if (id_caja) agregar('sc.id_caja = ?', id_caja);
    if (fecha_desde) agregar('sc.fecha_operacion >= ?::date', fecha_desde);
    if (fecha_hasta) agregar('sc.fecha_operacion <= ?::date', fecha_hasta);

    const { rows } = await pool.query(
      `SELECT
         sc.*,
         c.id_sucursal,
         c.nombre AS nombre_caja,
         s.nombre_sucursal,
         ua.nombre_usuario AS usuario_apertura,
         uc.nombre_usuario AS usuario_cierre
       FROM sesion_caja sc
       JOIN caja c ON c.id_caja = sc.id_caja
       JOIN sucursal s ON s.id_sucursal = c.id_sucursal
       JOIN usuario ua ON ua.id_usuario = sc.id_usuario_apertura
       JOIN usuario uc ON uc.id_usuario = sc.id_usuario_cierre
       WHERE ${condiciones.join(' AND ')}
       ORDER BY sc.fecha_hora_cierre DESC, sc.id_sesion_caja DESC`,
      valores,
    );
    return rows;
  }

  async obtenerResumenDiario(fecha, id_sucursal = null) {
    const valores = [fecha];
    const filtroSucursal = id_sucursal
      ? `AND c.id_sucursal = $${valores.push(id_sucursal)}`
      : '';
    const { rows } = await pool.query(
      `SELECT
         c.id_sucursal,
         s.nombre_sucursal,
         COUNT(*) FILTER (WHERE sc.estado = 'cerrada')::INTEGER AS sesiones_cerradas,
         COUNT(*) FILTER (WHERE sc.estado = 'abierta')::INTEGER AS sesiones_abiertas,
         COALESCE(SUM(sc.total_ventas_efectivo) FILTER (
           WHERE sc.estado = 'cerrada'
         ), 0)::NUMERIC(14,2) AS ventas_efectivo,
         COALESCE(SUM(sc.total_ventas_tarjeta) FILTER (
           WHERE sc.estado = 'cerrada'
         ), 0)::NUMERIC(14,2) AS ventas_tarjeta,
         COALESCE(SUM(sc.total_entradas) FILTER (
           WHERE sc.estado = 'cerrada'
         ), 0)::NUMERIC(14,2) AS entradas,
         COALESCE(SUM(sc.total_salidas) FILTER (
           WHERE sc.estado = 'cerrada'
         ), 0)::NUMERIC(14,2) AS salidas,
         COALESCE(SUM(sc.diferencia_efectivo) FILTER (
           WHERE sc.estado = 'cerrada'
         ), 0)::NUMERIC(14,2) AS diferencia_efectivo
       FROM sesion_caja sc
       JOIN caja c ON c.id_caja = sc.id_caja
       JOIN sucursal s ON s.id_sucursal = c.id_sucursal
       WHERE sc.fecha_operacion = $1::date
       ${filtroSucursal}
       GROUP BY c.id_sucursal, s.nombre_sucursal
       ORDER BY s.nombre_sucursal`,
      valores,
    );
    return rows;
  }
}

module.exports = new CajaDAO();
