export function getDefaultRouteForRole(rol) {
  if (['dueno', 'administrador'].includes(rol)) return '/reports';
  if (rol === 'dependiente') return '/caja';
  if (rol === 'laboratorista') return '/laboratorio/pacientes';
  // Rol desconocido: la ayuda es la única pantalla abierta a cualquier sesión.
  return '/support';
}
