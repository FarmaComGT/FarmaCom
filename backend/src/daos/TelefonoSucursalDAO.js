const crearContactoDAO = require('./ContactoDAOFactory');

const dao = crearContactoDAO({
  tabla: 'telefono_sucursal',
  columnaId: 'id_telefono_sucursal',
  columnaPadre: 'id_sucursal',
  columnaValor: 'numero',
  conListarTodos: true,
});

module.exports = {
  crear: dao.crear,
  obtenerTodos: dao.obtenerTodos,
  obtenerPorId: dao.obtenerPorId,
  obtenerPorSucursal: dao.obtenerPorPadre,
  actualizar: dao.actualizar,
  eliminar: dao.eliminar,
  eliminarPorSucursal: dao.eliminarPorPadre,
};
