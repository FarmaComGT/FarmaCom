const crearContactoDAO = require('./ContactoDAOFactory');

const dao = crearContactoDAO({
  tabla: 'casa_telefono',
  columnaId: 'id_telefono',
  columnaPadre: 'id_casa',
  columnaValor: 'numero',
});

module.exports = {
  crear: dao.crear,
  obtenerPorId: dao.obtenerPorId,
  obtenerPorCasa: dao.obtenerPorPadre,
  actualizar: dao.actualizar,
  eliminar: dao.eliminar,
  eliminarPorCasa: dao.eliminarPorPadre,
};
