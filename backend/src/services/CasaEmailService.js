const CasaEmailDAO = require('../daos/CasaEmailDAO');
const CasaFarmaceuticaDAO = require('../daos/CasaFarmaceuticaDAO');
const crearContactoService = require('./ContactoServiceFactory');

const servicio = crearContactoService({
  dao: CasaEmailDAO,
  daoPadre: CasaFarmaceuticaDAO,
  columnaPadre: 'id_casa',
  nombrePadre: 'La casa farmacéutica',
  campoValor: 'correo',
  nombreValor: 'Correo',
  metodoObtenerPorPadre: 'obtenerPorCasa',
  validarDuplicado: true,
  metodoObtenerPorDuplicado: 'obtenerPorCorreo',
  mensajeDuplicado: 'Ya existe ese correo registrado en una casa farmacéutica',
});

module.exports = {
  crearEmail: servicio.crear,
  obtenerPorCasa: servicio.obtenerPorPadre,
  obtenerPorId: servicio.obtenerPorId,
  actualizarEmail: servicio.actualizar,
  eliminarEmail: servicio.eliminar,
};
