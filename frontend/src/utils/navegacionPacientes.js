const LISTADO = '/laboratorio/pacientes';
const CAMPOS = ['q', 'pagina', 'limite', 'estado', 'laboratorio'];
export function destinoPacientes(params) {
  const regreso = params.get('regreso');
  if (!regreso || !/^\/laboratorio\/pacientes(?:\?|$)/.test(regreso)) return LISTADO;
  const url = new URL(regreso, 'https://farmacom.local');
  if (url.pathname !== LISTADO) return LISTADO;
  const filtros = new URLSearchParams();
  CAMPOS.forEach(campo => {
    if (url.searchParams.has(campo)) filtros.set(campo, url.searchParams.get(campo));
  });
  return `${LISTADO}${filtros.size ? `?${filtros}` : ''}`;
}
