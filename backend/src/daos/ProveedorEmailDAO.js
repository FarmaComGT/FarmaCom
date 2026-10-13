const crearContactoDAO = require('./ContactoDAOFactory');

const dao = crearContactoDAO({
  tabla: 'proveedor_email',
  columnaId: 'id_email',
  columnaPadre: 'id_proveedor',
  columnaValor: 'correo',
  conUnicidad: true,
});

module.exports = {
  crear: dao.crear,
  obtenerPorId: dao.obtenerPorId,
  obtenerPorProveedor: dao.obtenerPorPadre,
  obtenerPorCorreo: dao.obtenerPorValor,
  actualizar: dao.actualizar,
  eliminar: dao.eliminar,
  eliminarPorProveedor: dao.eliminarPorPadre,
};
