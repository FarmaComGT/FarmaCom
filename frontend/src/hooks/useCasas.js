import api from '../api/axios';
import useListadoPaginado from './useListadoPaginado';

const useCasas = (filtros) => {
  const listado = useListadoPaginado('/casas', filtros, 'Error al cargar casas farmacéuticas');
  const { datos: casas, actualizarDatos, cargar, paginado } = listado;

  const crear = async (payload) => {
    const { data } = await api.post('/casas', payload);
    if (paginado) await cargar();
    else actualizarDatos((prev) => [...prev, data]);
    return data;
  };

  const actualizar = async (id, payload) => {
    const { data } = await api.put(`/casas/${id}`, payload);
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.map((c) => (c.id_casa === id ? data : c)));
    return data;
  };

  const cambiarEstado = async (id, activo) => {
    const { data } = await api.patch(`/casas/${id}/estado`, { activo });
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.map((c) => (c.id_casa === id ? data : c)));
    return data;
  };

  const eliminar = async (id) => {
    const { data = {} } = await api.delete(`/casas/${id}`);
    if (paginado) await cargar();
    else if (data.accion === 'desactivado') {
      actualizarDatos((prev) => prev.map((casa) => (
        casa.id_casa === id ? { ...casa, ...(data.casa || {}), activo: false } : casa
      )));
    } else actualizarDatos((prev) => prev.filter((casa) => casa.id_casa !== id));
    return data;
  };

  return { casas, paginacion: listado.paginacion, cargando: listado.cargando,
    error: listado.error, refrescar: cargar, crear, actualizar, cambiarEstado, eliminar };
};

export default useCasas;
