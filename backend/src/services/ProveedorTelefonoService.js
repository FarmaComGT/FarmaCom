const ProveedorTelefonoDAO = require('../daos/ProveedorTelefonoDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const crearContactoService = require('./ContactoServiceFactory');

const servicio = crearContactoService({
  dao: ProveedorTelefonoDAO,
  daoPadre: ProveedorDAO,
  columnaPadre: 'id_proveedor',
  nombrePadre: 'El proveedor',
  campoValor: 'numero',
  nombreValor: 'Teléfono',
  metodoObtenerPorPadre: 'obtenerPorProveedor',
});

module.exports = {
  crearTelefono: servicio.crear,
  obtenerPorProveedor: servicio.obtenerPorPadre,
  obtenerPorId: servicio.obtenerPorId,
  actualizarTelefono: servicio.actualizar,
  eliminarTelefono: servicio.eliminar,
};
