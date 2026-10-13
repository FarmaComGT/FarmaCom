const crearContactoDAO = require('./ContactoDAOFactory');

const dao = crearContactoDAO({
  tabla: 'casa_email',
  columnaId: 'id_email',
  columnaPadre: 'id_casa',
  columnaValor: 'correo',
  conUnicidad: true,
});

module.exports = {
  crear: dao.crear,
  obtenerPorId: dao.obtenerPorId,
  obtenerPorCasa: dao.obtenerPorPadre,
  obtenerPorCorreo: dao.obtenerPorValor,
  actualizar: dao.actualizar,
  eliminar: dao.eliminar,
  eliminarPorCasa: dao.eliminarPorPadre,
};
