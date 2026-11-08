const BitacoraInventarioDAO = require('../daos/BitacoraInventarioDAO');
const AppError = require('../errors/AppError');

const obtenerHistorial = async (filtros, usuario) => {
  const aplicados = { ...filtros };

  if (usuario.rol === 'dependiente') {
    const idSucursalUsuario = Number(usuario.id_sucursal);
    if (aplicados.id_sucursal && Number(aplicados.id_sucursal) !== idSucursalUsuario) {
      throw new AppError('No tienes permiso para consultar el historial de otra sucursal', 403);
    }
    aplicados.id_sucursal = idSucursalUsuario;
  }

  return BitacoraInventarioDAO.obtenerHistorial(aplicados);
};

module.exports = { obtenerHistorial };
