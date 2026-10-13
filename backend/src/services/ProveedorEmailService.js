const ProveedorEmailDAO = require('../daos/ProveedorEmailDAO');
const ProveedorDAO = require('../daos/ProveedorDAO');
const crearContactoService = require('./ContactoServiceFactory');

const servicio = crearContactoService({
  dao: ProveedorEmailDAO,
  daoPadre: ProveedorDAO,
  columnaPadre: 'id_proveedor',
  nombrePadre: 'El proveedor',
  campoValor: 'correo',
  nombreValor: 'Correo',
  metodoObtenerPorPadre: 'obtenerPorProveedor',
  validarDuplicado: true,
  metodoObtenerPorDuplicado: 'obtenerPorCorreo',
  mensajeDuplicado: 'Ya existe ese correo registrado en un proveedor',
});

module.exports = {
  crearEmail: servicio.crear,
  obtenerPorProveedor: servicio.obtenerPorPadre,
  obtenerPorId: servicio.obtenerPorId,
  actualizarEmail: servicio.actualizar,
  eliminarEmail: servicio.eliminar,
};
