export function getDefaultRouteForRole(rol) {
  return ['dueno', 'administrador'].includes(rol) ? '/reports' : '/dashboard';
}
