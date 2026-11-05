import api from '../api/axios';
import useListadoPaginado from './useListadoPaginado';

const ordenarCiudades = (ciudades) => [...ciudades].sort((a, b) => (
  a.nombre_ciudad.localeCompare(b.nombre_ciudad)
));

const useCiudades = (filtros) => {
  const listado = useListadoPaginado('/ciudades', filtros, 'Error al cargar ciudades');
  const { datos: ciudades, actualizarDatos, cargar, paginado } = listado;

  const crear = async (payload) => {
    const { data } = await api.post('/ciudades', payload);
    if (paginado) await cargar();
    else actualizarDatos((prev) => ordenarCiudades([...prev, data]));
    return data;
  };

  const actualizar = async (id, payload) => {
    const { data } = await api.put(`/ciudades/${id}`, payload);
    if (paginado) await cargar();
    else actualizarDatos((prev) => ordenarCiudades(prev.map((ciudad) => (
      ciudad.id_ciudad === id ? data : ciudad
    ))));
    return data;
  };

  const eliminar = async (id) => {
    await api.delete(`/ciudades/${id}`);
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.filter((ciudad) => ciudad.id_ciudad !== id));
  };

  return { ciudades, paginacion: listado.paginacion, cargandoCiudades: listado.cargando,
    errorCiudades: listado.error, refrescarCiudades: cargar, crear, actualizar, eliminar };
};

export default useCiudades;
