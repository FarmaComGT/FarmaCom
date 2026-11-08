const pool = require('../database/db');
const { ejecutarConsultaPaginada } = require('../utils/paginacion');

class PacienteDAO {
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

  async crear({
    id_laboratorio,
    nombre_paciente,
    dpi,
    fecha_nacimiento,
    edad_manual,
    sexo,
    telefono,
    direccion,
    observaciones,
  }, client) {
    const { rows } = await client.query(
      `INSERT INTO paciente (
         id_laboratorio, nombre_paciente, dpi, fecha_nacimiento, edad_manual, sexo,
         telefono, direccion, observaciones
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id_laboratorio,
        nombre_paciente,
        dpi ?? null,
        fecha_nacimiento ?? null,
        edad_manual ?? null,
        sexo,
        telefono ?? null,
        direccion ?? null,
        observaciones ?? null,
      ],
    );
    return rows[0];
  }

  async crearExpediente(id_paciente, client) {
    const { rows } = await client.query(
      `INSERT INTO expediente_laboratorio (id_paciente)
       VALUES ($1)
       RETURNING *`,
      [id_paciente],
    );
    return rows[0];
  }

  async obtenerPorId(id_paciente, client = pool) {
    const { rows } = await client.query(
      `SELECT p.*, l.nombre_laboratorio, e.id_expediente
       FROM paciente p
       JOIN laboratorio l ON l.id_laboratorio = p.id_laboratorio
       LEFT JOIN expediente_laboratorio e ON e.id_paciente = p.id_paciente
       WHERE p.id_paciente = $1`,
      [id_paciente],
    );
    return rows[0] || null;
  }

  async obtenerParaActualizar(id_paciente, client) {
    const { rows } = await client.query(
      `SELECT * FROM paciente WHERE id_paciente = $1 FOR UPDATE`,
      [id_paciente],
    );
    return rows[0] || null;
  }

  async obtenerPorDpi(dpi, client = pool) {
    const { rows } = await client.query(
      `SELECT * FROM paciente WHERE dpi = $1`,
      [dpi],
    );
    return rows[0] || null;
  }

  async obtenerPorNombre(nombre_paciente, client = pool) {
    const { rows } = await client.query(
      `SELECT * FROM paciente WHERE lower(trim(nombre_paciente)) = lower(trim($1))`,
      [nombre_paciente],
    );
    return rows[0] || null;
  }

  async buscar({ id_laboratorio, busqueda, estado, pagina, limite }) {
    const condiciones = ['p.id_laboratorio = $1'];
    const valores = [id_laboratorio];

    if (estado) {
      valores.push(estado);
      condiciones.push(`p.estado = $${valores.length}`);
    }

    if (busqueda) {
      const patron = `%${busqueda.replace(/[\\%_]/g, '\\$&')}%`;
      valores.push(patron);
      const indiceBusqueda = valores.length;
      condiciones.push(
        `(p.nombre_paciente ILIKE $${indiceBusqueda} ESCAPE '\\' OR p.dpi ILIKE $${indiceBusqueda} ESCAPE '\\')`,
      );
    }

    const resultado = await ejecutarConsultaPaginada({
      cliente: pool,
      consultaBase: `SELECT p.* FROM paciente p WHERE ${condiciones.join(' AND ')}`,
      valores,
      orden: 'ORDER BY p.nombre_paciente ASC, p.id_paciente ASC',
      pagina,
      limite,
    });
    return {
      datos: resultado.datos,
      total: resultado.paginacion.total,
      pagina: resultado.paginacion.pagina,
    };
  }

  async actualizar(id_paciente, campos, client = pool) {
    const {
      nombre_paciente,
      sexo,
      telefono,
      direccion,
      observaciones,
    } = campos;
    const incluyeDpi = Object.prototype.hasOwnProperty.call(campos, 'dpi');
    const incluyeFechaNacimiento = Object.prototype.hasOwnProperty.call(campos, 'fecha_nacimiento');
    const incluyeEdadManual = Object.prototype.hasOwnProperty.call(campos, 'edad_manual');
    const incluyeTelefono = Object.prototype.hasOwnProperty.call(campos, 'telefono');
    const incluyeDireccion = Object.prototype.hasOwnProperty.call(campos, 'direccion');
    const incluyeObservaciones = Object.prototype.hasOwnProperty.call(campos, 'observaciones');

    const { rows } = await client.query(
      `UPDATE paciente SET
         nombre_paciente  = COALESCE($1, nombre_paciente),
         dpi              = CASE WHEN $2 THEN $3 ELSE dpi END,
         fecha_nacimiento = CASE WHEN $4 THEN $5 ELSE fecha_nacimiento END,
         edad_manual      = CASE WHEN $6 THEN $7 ELSE edad_manual END,
         sexo             = COALESCE($8, sexo),
         telefono         = CASE WHEN $9 THEN $10 ELSE telefono END,
         direccion        = CASE WHEN $11 THEN $12 ELSE direccion END,
         observaciones    = CASE WHEN $13 THEN $14 ELSE observaciones END
       WHERE id_paciente = $15
       RETURNING *`,
      [
        nombre_paciente ?? null,
        incluyeDpi,
        campos.dpi ?? null,
        incluyeFechaNacimiento,
        campos.fecha_nacimiento ?? null,
        incluyeEdadManual,
        campos.edad_manual ?? null,
        sexo ?? null,
        incluyeTelefono,
        telefono ?? null,
        incluyeDireccion,
        direccion ?? null,
        incluyeObservaciones,
        observaciones ?? null,
        id_paciente,
      ],
    );
    return rows[0] || null;
  }

  async anular(id_paciente, motivo_anulacion, client) {
    const { rows } = await client.query(
      `UPDATE paciente
       SET estado = 'anulado',
           motivo_anulacion = $1,
           fecha_anulacion = CURRENT_TIMESTAMP
       WHERE id_paciente = $2
       RETURNING *`,
      [motivo_anulacion, id_paciente],
    );
    return rows[0] || null;
  }

  // Borrado permanente: el expediente, las visitas y los resultados del
  // paciente se eliminan en cascada (ver migracion 006).
  async eliminar(id_paciente, client) {
    const { rows } = await client.query(
      `DELETE FROM paciente WHERE id_paciente = $1 RETURNING *`,
      [id_paciente],
    );
    return rows[0] || null;
  }
}

module.exports = new PacienteDAO();
