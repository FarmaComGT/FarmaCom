const crearError = (mensaje, status) => {
  const error = new Error(mensaje);
  error.status = status;
  return error;
};

const obtenerIdUsuario = (usuario) => {
  if (!usuario || !Number.isInteger(usuario.id_usuario) || usuario.id_usuario <= 0) {
    throw crearError('No autenticado.', 401);
  }
  return usuario.id_usuario;
};

// Dueños y administradores conservan el acceso global que les conceden las
// rutas. Un laboratorista solo puede operar sobre el laboratorio que tiene
// asignado en la base de datos y que verificarToken adjunta a la solicitud.
const validarPertenenciaLaboratorio = (usuario, idLaboratorioRecurso) => {
  obtenerIdUsuario(usuario);
  if (usuario.rol !== 'laboratorista') return;

  const idLaboratorioUsuario = Number(usuario.id_laboratorio);
  const idLaboratorio = Number(idLaboratorioRecurso);
  if (!Number.isInteger(idLaboratorioUsuario)
    || idLaboratorioUsuario <= 0
    || !Number.isInteger(idLaboratorio)
    || idLaboratorioUsuario !== idLaboratorio) {
    throw crearError('No tienes acceso al recurso solicitado.', 403);
  }
};

module.exports = { obtenerIdUsuario, validarPertenenciaLaboratorio };
