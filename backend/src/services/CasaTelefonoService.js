const CasaTelefonoDAO = require('../daos/CasaTelefonoDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const crearContactoService = require('./ContactoServiceFactory');

const servicio = crearContactoService({
  dao: CasaTelefonoDAO,
  daoPadre: CasaFarmaceuticaDAO,
  columnaPadre: 'id_casa',
  nombrePadre: 'La casa farmacéutica',
  campoValor: 'numero',
  nombreValor: 'Teléfono',
  metodoObtenerPorPadre: 'obtenerPorCasa',
});

module.exports = {
  crearTelefono: servicio.crear,
  obtenerPorCasa: servicio.obtenerPorPadre,
  obtenerPorId: servicio.obtenerPorId,
  actualizarTelefono: servicio.actualizar,
  eliminarTelefono: servicio.eliminar,
};
