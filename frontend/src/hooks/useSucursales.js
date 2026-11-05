import api from '../api/axios';
import useListadoPaginado from './useListadoPaginado';

const useSucursales = (filtros) => {
  const listado = useListadoPaginado('/sucursales', filtros, 'Error al cargar sucursales');
  const { datos: sucursales, actualizarDatos, cargar, paginado } = listado;

  const ejecutar = async (operacion, predeterminado) => {
    try { return await operacion(); } catch (error) {
      throw new Error(error.response?.data?.mensaje || predeterminado);
    }
  };

  const crear = async (datos) => ejecutar(async () => {
    const { data } = await api.post('/sucursales', datos);
    if (paginado) await cargar();
    else actualizarDatos((prev) => [...prev, data]);
    return data;
  }, 'Error al crear sucursal');

  const actualizar = async (id, datos) => ejecutar(async () => {
    const { data } = await api.put(`/sucursales/${id}`, datos);
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.map((s) => (s.id_sucursal === id ? data : s)));
    return data;
  }, 'Error al actualizar sucursal');

  const eliminar = async (id) => ejecutar(async () => {
    await api.delete(`/sucursales/${id}`);
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.filter((s) => s.id_sucursal !== id));
  }, 'Error al eliminar sucursal');

  return { sucursales, paginacion: listado.paginacion, cargando: listado.cargando,
    error: listado.error, crear, actualizar, eliminar, refrescar: cargar };
};

export default useSucursales;
