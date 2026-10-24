const pool = require('../database/db');
const crearContactoDAO = require('./ContactoDAOFactory');

const dao = crearContactoDAO({
  tabla: 'cliente_email',
  columnaId: 'id_email',
  columnaPadre: 'id_cliente',
  columnaValor: 'correo',
});

const obtenerPorClienteYCorreo = async (idCliente, correo) => {
  const { rows } = await pool.query(
    'SELECT * FROM cliente_email WHERE id_cliente = $1 AND LOWER(correo) = LOWER($2)',
    [idCliente, correo],
  );
  return rows[0] || null;
};

module.exports = {
  crear: dao.crear,
  obtenerPorId: dao.obtenerPorId,
  obtenerPorCliente: dao.obtenerPorPadre,
  obtenerPorClienteYCorreo,
  actualizar: dao.actualizar,
  eliminar: dao.eliminar,
};
