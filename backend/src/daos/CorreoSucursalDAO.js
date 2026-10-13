const crearContactoDAO = require('./ContactoDAOFactory');

const dao = crearContactoDAO({
  tabla: 'correo_sucursal',
  columnaId: 'id_correo_sucursal',
  columnaPadre: 'id_sucursal',
  columnaValor: 'correo',
  conUnicidad: true,
  conListarTodos: true,
});

module.exports = {
  crear: dao.crear,
  obtenerTodos: dao.obtenerTodos,
  obtenerPorId: dao.obtenerPorId,
  obtenerPorSucursal: dao.obtenerPorPadre,
  obtenerPorCorreo: dao.obtenerPorValor,
  actualizar: dao.actualizar,
  eliminar: dao.eliminar,
  eliminarPorSucursal: dao.eliminarPorPadre,
};
