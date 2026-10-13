const CorreoSucursalDAO = require('../daos/CorreoSucursalDAO');
const SucursalDAO = require('../daos/SucursalDAO');
const crearContactoService = require('./ContactoServiceFactory');

const servicio = crearContactoService({
  dao: CorreoSucursalDAO,
  daoPadre: SucursalDAO,
  columnaPadre: 'id_sucursal',
  nombrePadre: 'La sucursal',
  campoValor: 'correo',
  nombreValor: 'Correo',
  metodoObtenerPorPadre: 'obtenerPorSucursal',
  validarDuplicado: true,
  metodoObtenerPorDuplicado: 'obtenerPorCorreo',
  mensajeDuplicado: 'Ya existe ese correo registrado en una sucursal',
});

module.exports = {
  crearCorreo: servicio.crear,
  obtenerPorSucursal: servicio.obtenerPorPadre,
  obtenerPorId: servicio.obtenerPorId,
  actualizarCorreo: servicio.actualizar,
  eliminarCorreo: servicio.eliminar,
};
