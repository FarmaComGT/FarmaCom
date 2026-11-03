const pool = require('../database/db');

class UsuarioDAO {
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
    // ─── CREATE ────

    async crear(usuario, client = pool) {
        const { id_sucursal, id_laboratorio, nombre_usuario, correo_usuario, contrasena_hash, rol } = usuario;

        const query = `
      INSERT INTO usuario (id_sucursal, id_laboratorio, nombre_usuario, correo_usuario, contrasena_hash, rol)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
        const valores = [id_sucursal, id_laboratorio, nombre_usuario, correo_usuario, contrasena_hash, rol];
        const { rows } = await client.query(query, valores);
        return rows[0];
    }


    // ─── OBTENER ────

    async obtenerTodos(client = pool) {
        const query = `SELECT * FROM usuario ORDER BY id_usuario`;
        const { rows } = await client.query(query);
        return rows;
    }

    async obtenerPorId(id_usuario, client = pool) {
        const query = `SELECT * FROM usuario WHERE id_usuario = $1`;
        const { rows } = await client.query(query, [id_usuario]);
        return rows[0] || null;
    }

    async obtenerPorCorreo(correo_usuario, client = pool) {
        const query = `SELECT * FROM usuario WHERE correo_usuario = $1`;
        const { rows } = await client.query(query, [correo_usuario]);
        return rows[0] || null;
    }

    async obtenerPorSucursal(id_sucursal, client = pool) {
        const query = `SELECT * FROM usuario WHERE id_sucursal = $1 ORDER BY id_usuario`;
        const { rows } = await client.query(query, [id_sucursal]);
        return rows;
    }

    async obtenerParaActualizar(id_usuario, client) {
        const { rows } = await client.query(
            'SELECT * FROM usuario WHERE id_usuario = $1 FOR UPDATE',
            [id_usuario],
        );
        return rows[0] || null;
    }

    async bloquearProteccionDuenos(client) {
        await client.query(
            "SELECT pg_advisory_xact_lock(hashtext('farmacom_ultimo_dueno_activo'))",
        );
    }

    async contarDuenosActivos(client) {
        const { rows } = await client.query(
            `SELECT COUNT(*)::INTEGER AS total
             FROM usuario
             WHERE rol = 'dueno' AND estado_usuario = 'activo'`,
        );
        return Number(rows[0]?.total || 0);
    }


    // ─── UPDATE ────

    async actualizar(id_usuario, campos, client = pool) {
        const { nombre_usuario, correo_usuario, rol, id_sucursal, id_laboratorio } = campos;

        const query = `
      UPDATE usuario
      SET
        nombre_usuario  = COALESCE($1, nombre_usuario),
        correo_usuario  = COALESCE($2, correo_usuario),
        rol             = COALESCE($3, rol),
        id_sucursal     = COALESCE($4, id_sucursal),
        id_laboratorio  = $5
      WHERE id_usuario = $6
      RETURNING *
    `;
        const valores = [nombre_usuario, correo_usuario, rol, id_sucursal, id_laboratorio, id_usuario];
        const { rows } = await client.query(query, valores);
        return rows[0] || null;
    }

    async actualizarContrasena(id_usuario, nueva_contrasena_hash, client = pool) {
        const query = `
      UPDATE usuario
      SET contrasena_hash = $1
      WHERE id_usuario = $2
      RETURNING *
    `;
        const { rows } = await client.query(query, [nueva_contrasena_hash, id_usuario]);
        return rows[0] || null;
    }

    async incrementarTokenVersion(id_usuario, client = pool) {
        const query = `
      UPDATE usuario
      SET token_version = token_version + 1
      WHERE id_usuario = $1
      RETURNING *
    `;
        const { rows } = await client.query(query, [id_usuario]);
        return rows[0] || null;
    }

    async cambiarEstado(id_usuario, nuevo_estado, client = pool) {
        const query = `
      UPDATE usuario
      SET estado_usuario = $1,
          token_version = token_version + 1
      WHERE id_usuario = $2
      RETURNING *
    `;
        const { rows } = await client.query(query, [nuevo_estado, id_usuario]);
        return rows[0] || null;
    }


    // ─── DELETE ────

    async eliminar(id_usuario, client = pool) {
        const query = `DELETE FROM usuario WHERE id_usuario = $1 RETURNING *`;
        const { rows } = await client.query(query, [id_usuario]);
        return rows[0] || null;
    }
}

module.exports = new UsuarioDAO();
