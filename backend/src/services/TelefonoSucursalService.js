const TelefonoSucursalDAO = require('../daos/TelefonoSucursalDAO');
const SucursalDAO = require('../daos/SucursalDAO');
const crearContactoService = require('./ContactoServiceFactory');

const servicio = crearContactoService({
  dao: TelefonoSucursalDAO,
  daoPadre: SucursalDAO,
  columnaPadre: 'id_sucursal',
  nombrePadre: 'La sucursal',
  campoValor: 'numero',
  nombreValor: 'Teléfono',
  metodoObtenerPorPadre: 'obtenerPorSucursal',
});

module.exports = {
  crearTelefono: servicio.crear,
  obtenerPorSucursal: servicio.obtenerPorPadre,
  obtenerPorId: servicio.obtenerPorId,
  actualizarTelefono: servicio.actualizar,
  eliminarTelefono: servicio.eliminar,
};
