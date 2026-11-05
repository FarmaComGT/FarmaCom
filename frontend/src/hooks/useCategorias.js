import api from '../api/axios';
import useListadoPaginado from './useListadoPaginado';

const useCategorias = (filtros) => {
  const listado = useListadoPaginado('/categorias', filtros, 'Error al cargar categorías');
  const { datos: categorias, actualizarDatos, cargar, paginado } = listado;

  const crear = async (payload) => {
    const { data } = await api.post('/categorias', payload);
    if (paginado) await cargar();
    else actualizarDatos((prev) => [...prev, data]);
    return data;
  };

  const actualizar = async (id, payload) => {
    const { data } = await api.put(`/categorias/${id}`, payload);
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.map((c) => (c.id_categoria === id ? data : c)));
    return data;
  };

  const eliminar = async (id) => {
    await api.delete(`/categorias/${id}`);
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.filter((c) => c.id_categoria !== id));
  };

  return { categorias, paginacion: listado.paginacion, cargando: listado.cargando,
    error: listado.error, refrescar: cargar, crear, actualizar, eliminar };
};

export default useCategorias;
