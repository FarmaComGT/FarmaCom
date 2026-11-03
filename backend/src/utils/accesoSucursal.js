const AppError = require('../errors/AppError');

const ROLES_ACCESO_GLOBAL = new Set(['dueno', 'administrador']);

const puedeAccederSucursal = (usuario, idSucursal) => (
  Boolean(usuario)
  && (
    ROLES_ACCESO_GLOBAL.has(usuario.rol)
    || (
      usuario.rol === 'dependiente'
      && Number(usuario.id_sucursal) === Number(idSucursal)
    )
  )
);

const validarAccesoSucursal = (
  usuario,
  idSucursal,
  mensaje = 'No tienes permiso para consultar otra sucursal',
) => {
  if (!puedeAccederSucursal(usuario, idSucursal)) {
    throw new AppError(mensaje, 403);
  }
};

module.exports = {
  ROLES_ACCESO_GLOBAL,
  puedeAccederSucursal,
  validarAccesoSucursal,
};
