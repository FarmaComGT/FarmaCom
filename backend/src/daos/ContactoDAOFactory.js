const pool = require('../database/db');

/**
 * Construye un DAO de "contacto" (correo o teléfono) para una tabla con la forma
 * (id propio, id del padre, valor). Los nombres de tabla/columna son fijos por
 * cada llamador en este mismo codebase, nunca vienen de una petición HTTP.
 */
const crearContactoDAO = ({
  tabla,
  columnaId,
  columnaPadre,
  columnaValor,
  conUnicidad = false,
  conListarTodos = false,
}) => {
  const dao = {
    async crear(datos) {
      const query = `
        INSERT INTO ${tabla} (${columnaPadre}, ${columnaValor})
        VALUES ($1, $2)
        RETURNING *
      `;
      const { rows } = await pool.query(query, [datos[columnaPadre], datos[columnaValor]]);
      return rows[0];
    },

    async obtenerPorId(id) {
      const query = `SELECT * FROM ${tabla} WHERE ${columnaId} = $1`;
      const { rows } = await pool.query(query, [id]);
      return rows[0] || null;
    },

    async obtenerPorPadre(idPadre) {
      const query = `
        SELECT * FROM ${tabla}
        WHERE ${columnaPadre} = $1
        ORDER BY ${columnaId}
      `;
      const { rows } = await pool.query(query, [idPadre]);
      return rows;
    },

    async actualizar(id, datos) {
      const query = `
        UPDATE ${tabla}
        SET ${columnaValor} = COALESCE($1, ${columnaValor})
        WHERE ${columnaId} = $2
        RETURNING *
      `;
      const { rows } = await pool.query(query, [datos[columnaValor] ?? null, id]);
      return rows[0] || null;
    },

    async eliminar(id) {
      const query = `DELETE FROM ${tabla} WHERE ${columnaId} = $1 RETURNING *`;
      const { rows } = await pool.query(query, [id]);
      return rows[0] || null;
    },

    async eliminarPorPadre(idPadre) {
      const query = `DELETE FROM ${tabla} WHERE ${columnaPadre} = $1 RETURNING *`;
      const { rows } = await pool.query(query, [idPadre]);
      return rows;
    },
  };

  if (conUnicidad) {
    dao.obtenerPorValor = async (valor) => {
      const query = `SELECT * FROM ${tabla} WHERE ${columnaValor} = $1`;
      const { rows } = await pool.query(query, [valor]);
      return rows[0] || null;
    };
  }

  if (conListarTodos) {
    dao.obtenerTodos = async () => {
      const query = `SELECT * FROM ${tabla} ORDER BY ${columnaId}`;
      const { rows } = await pool.query(query);
      return rows;
    };
  }

  return dao;
};

module.exports = crearContactoDAO;
