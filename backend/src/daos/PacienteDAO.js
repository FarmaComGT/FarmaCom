const pool = require('../database/db');

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

    valores.push(limite);
    const indiceLimite = valores.length;
    valores.push((pagina - 1) * limite);
    const indiceOffset = valores.length;

    const { rows } = await pool.query(
      `SELECT p.*, COUNT(*) OVER()::INTEGER AS total_registros
       FROM paciente p
       WHERE ${condiciones.join(' AND ')}
       ORDER BY p.nombre_paciente ASC, p.id_paciente ASC
       LIMIT $${indiceLimite} OFFSET $${indiceOffset}`,
      valores,
    );

    const total = rows[0]?.total_registros ?? 0;
    const datos = rows.map(({ total_registros, ...paciente }) => paciente);
    return { datos, total };
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

    const { rows } = await client.query(
      `UPDATE paciente SET
         nombre_paciente  = COALESCE($1, nombre_paciente),
         dpi              = CASE WHEN $2 THEN $3 ELSE dpi END,
         fecha_nacimiento = CASE WHEN $4 THEN $5 ELSE fecha_nacimiento END,
         edad_manual      = CASE WHEN $6 THEN $7 ELSE edad_manual END,
         sexo             = COALESCE($8, sexo),
         telefono         = COALESCE($9, telefono),
         direccion        = COALESCE($10, direccion),
         observaciones    = COALESCE($11, observaciones)
       WHERE id_paciente = $12
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
        telefono ?? null,
        direccion ?? null,
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
}

module.exports = new PacienteDAO();
