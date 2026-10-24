const pool = require('../database/db');
const crearContactoDAO = require('./ContactoDAOFactory');

const dao = crearContactoDAO({
  tabla: 'cliente_telefono',
  columnaId: 'id_telefono',
  columnaPadre: 'id_cliente',
  columnaValor: 'numero',
});

const obtenerPorClienteYNumero = async (idCliente, numero) => {
  const { rows } = await pool.query(
    'SELECT * FROM cliente_telefono WHERE id_cliente = $1 AND numero = $2',
    [idCliente, numero],
  );
  return rows[0] || null;
};

module.exports = {
  crear: dao.crear,
  obtenerPorId: dao.obtenerPorId,
  obtenerPorCliente: dao.obtenerPorPadre,
  obtenerPorClienteYNumero,
  actualizar: dao.actualizar,
  eliminar: dao.eliminar,
};
