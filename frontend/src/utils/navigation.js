export function getDefaultRouteForRole(rol) {
  if (['dueno', 'administrador'].includes(rol)) return '/reports';
  if (rol === 'dependiente') return '/caja';
  return '/dashboard';
}
