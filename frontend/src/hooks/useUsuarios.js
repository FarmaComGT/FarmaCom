import api from '../api/axios';
import useListadoPaginado from './useListadoPaginado';

const useUsuarios = (filtros) => {
  const listado = useListadoPaginado('/usuarios', filtros, 'Error al cargar usuarios');
  const { datos: usuarios, actualizarDatos, cargar, paginado } = listado;

  const ejecutar = async (operacion, predeterminado) => {
    try { return await operacion(); } catch (error) {
      throw new Error(error.response?.data?.mensaje || predeterminado);
    }
  };

  const crear = async (datos) => ejecutar(async () => {
    const { data } = await api.post('/usuarios', datos);
    if (paginado) await cargar();
    else actualizarDatos((prev) => [...prev, data]);
    return data;
  }, 'Error al crear usuario');

  const actualizar = async (id, datos) => ejecutar(async () => {
    const { data } = await api.put(`/usuarios/${id}`, datos);
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.map((u) => (u.id_usuario === id ? data : u)));
    return data;
  }, 'Error al actualizar usuario');

  const cambiarEstado = async (id, estado) => ejecutar(async () => {
    const { data } = await api.patch(`/usuarios/${id}/estado`, { estado });
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.map((u) => (u.id_usuario === id ? data : u)));
    return data;
  }, 'Error al cambiar estado del usuario');

  const restablecerContrasena = async (id, datos) => ejecutar(async () => {
    const { data } = await api.patch(`/usuarios/${id}/contrasena`, datos);
    return data;
  }, 'No se pudo restablecer la contraseña.');

  return { usuarios, paginacion: listado.paginacion, cargando: listado.cargando, restablecerContrasena,
    error: listado.error, crear, actualizar, cambiarEstado, refrescar: cargar };
};

export default useUsuarios;
