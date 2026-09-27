export function getDefaultRouteForRole(rol) {
  if (rol === 'dueno' || rol === 'administrador') {
    return '/usuarios';
  }

  if (rol === 'laboratorista') {
    return '/laboratorio/pacientes';
  }

  return '/dashboard';
}
