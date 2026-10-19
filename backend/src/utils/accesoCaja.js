const ROLES_ACCESO_GLOBAL = new Set(['dueno', 'administrador']);

const crearError = (mensaje, status) => {
  const error = new Error(mensaje);
  error.status = status;
  return error;
};

const obtenerIdUsuario = (usuario) => {
  const idUsuario = Number(usuario?.id_usuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    throw crearError('No autenticado.', 401);
  }
  return idUsuario;
};

const tieneAccesoSesionCaja = (usuario, sesion) => {
  const idUsuario = obtenerIdUsuario(usuario);
  if (ROLES_ACCESO_GLOBAL.has(usuario.rol)) return true;

  return usuario.rol === 'dependiente'
    && Number(sesion?.id_usuario_apertura) === idUsuario;
};

const validarPertenenciaSesionCaja = (usuario, sesion) => {
  if (!tieneAccesoSesionCaja(usuario, sesion)) {
    throw crearError('No tienes acceso a la sesión de caja solicitada.', 403);
  }
};

module.exports = {
  ROLES_ACCESO_GLOBAL,
  obtenerIdUsuario,
  tieneAccesoSesionCaja,
  validarPertenenciaSesionCaja,
};
