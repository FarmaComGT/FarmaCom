const farmacia = ['dueno', 'administrador', 'dependiente'];
const gestion = ['dueno', 'administrador'];

export const INICIO = { icon: 'overview', label: 'Inicio', path: '/dashboard' };
export const AYUDA = { icon: 'help', label: 'Ayuda', path: '/support' };

export const NAVEGACION = [
  { label: 'Operación', items: [
    { icon: 'dispensing', label: 'Punto de venta', path: '/pos', roles: farmacia, area: 'Ventas' },
    { icon: 'cash', label: 'Caja', path: '/caja', roles: farmacia, pagina: 'Operación' },
    { id: 'inventario', icon: 'inventory', label: 'Inventario', roles: farmacia, children: [
      { label: 'Existencias', path: '/inventario' },
      { label: 'Categorías', path: '/inventario/categorias' },
      { label: 'Proveedores', path: '/inventario/proveedores' },
      { label: 'Casas farmacéuticas', path: '/inventario/casas' },
      { label: 'Promociones', path: '/inventario/promociones', roles: gestion },
    ] },
    { icon: 'customer', label: 'Clientes', path: '/patients', roles: farmacia },
    { icon: 'laboratory', label: 'Laboratorio', path: '/laboratorio/pacientes', roles: ['dueno', 'administrador', 'laboratorista'], pagina: 'Pacientes' },
  ] },
  { label: 'Seguimiento', items: [
    { icon: 'history', label: 'Historial de ventas', path: '/ventas/historial', roles: gestion },
    { icon: 'reports', label: 'Reportes', path: '/reports', roles: gestion, pagina: 'Ventas', excluir: ['/reports/resumen-diario'] },
  ] },
  { label: 'Administración', items: [
    { icon: 'team', label: 'Usuarios', path: '/usuarios', roles: gestion, area: 'Administración' },
    { id: 'ubicaciones', icon: 'locations', label: 'Ubicaciones', roles: gestion, children: [
      { label: 'Sucursales', path: '/sucursales' },
      { label: 'Sedes de laboratorio', path: '/laboratorios' },
      { label: 'Ciudades', path: '/ciudades' },
    ] },
    { icon: 'reports', label: 'Envío de resumen', path: '/reports/resumen-diario', roles: ['dueno'], area: 'Administración' },
  ] },
];

const contextos = [INICIO, AYUDA, ...NAVEGACION.flatMap(seccion => seccion.items.flatMap(item => item.children
  ? item.children.map(hijo => ({ ...hijo, area: item.label, grupo: item.id, destino: item.children[0].path === hijo.path ? null : item.children[0].path }))
  : item))].map(item => ({
    path: item.path, area: item.area || item.label,
    pagina: item.pagina || (item.area ? item.label : null),
    destino: item.destino || null, grupo: item.grupo,
  }));

// Los detalles aportan su propio contexto; los nombres de los destinos salen del menú.
const detalles = [
  { path: '/ventas/historial/productos', area: 'Historial de ventas', pagina: 'Resumen por producto', destino: '/ventas/historial' },
  { path: '/caja/historial', area: 'Caja', pagina: 'Historial', destino: '/caja' },
  { path: '/caja/administracion', area: 'Caja', pagina: 'Administración', destino: '/caja' },
  { path: '/reports/rentabilidad', area: 'Reportes', pagina: 'Rentabilidad', destino: '/reports' },
];
const rutas = [...detalles, ...contextos].sort((a, b) => b.path.length - a.path.length);

export function contextoNavegacion(pathname) {
  if (/^\/inventario\/productos\/[^/]+\/lotes\/?$/.test(pathname)) {
    return { area: 'Inventario', pagina: 'Lotes del producto', destino: '/inventario', grupo: 'inventario' };
  }
  if (/^\/laboratorio\/pacientes\/[^/]+\/?$/.test(pathname)) {
    return { area: 'Laboratorio', pagina: 'Expediente', destino: '/laboratorio/pacientes' };
  }
  return rutas.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`))
    || { area: 'FarmaCom', pagina: null, destino: null };
}
