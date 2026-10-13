const crearContactoDAO = require('./ContactoDAOFactory');

const dao = crearContactoDAO({
  tabla: 'proveedor_telefono',
  columnaId: 'id_telefono',
  columnaPadre: 'id_proveedor',
  columnaValor: 'numero',
});

module.exports = {
  crear: dao.crear,
  obtenerPorId: dao.obtenerPorId,
  obtenerPorProveedor: dao.obtenerPorPadre,
  actualizar: dao.actualizar,
  eliminar: dao.eliminar,
  eliminarPorProveedor: dao.eliminarPorPadre,
};
