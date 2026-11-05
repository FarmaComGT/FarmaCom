import api from '../api/axios';
import useListadoPaginado from './useListadoPaginado';

const useProveedores = (filtros) => {
  const listado = useListadoPaginado('/proveedores', filtros, 'Error al cargar proveedores');
  const { datos: proveedores, actualizarDatos, cargar, paginado } = listado;

  const crear = async (payload) => {
    const { data } = await api.post('/proveedores', payload);
    if (paginado) await cargar();
    else actualizarDatos((prev) => [...prev, data]);
    return data;
  };

  const actualizar = async (id, payload) => {
    const { data } = await api.put(`/proveedores/${id}`, payload);
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.map((p) => (p.id_proveedor === id ? data : p)));
    return data;
  };

  const cambiarEstado = async (id, activo) => {
    const { data } = await api.patch(`/proveedores/${id}/estado`, { activo });
    if (paginado) await cargar();
    else actualizarDatos((prev) => prev.map((p) => (p.id_proveedor === id ? data : p)));
    return data;
  };

  const eliminar = async (id) => {
    const { data = {} } = await api.delete(`/proveedores/${id}`);
    if (paginado) await cargar();
    else if (data.accion === 'desactivado') {
      actualizarDatos((prev) => prev.map((proveedor) => (
        proveedor.id_proveedor === id
          ? { ...proveedor, ...(data.proveedor || {}), activo: false }
          : proveedor
      )));
    } else actualizarDatos((prev) => prev.filter((proveedor) => proveedor.id_proveedor !== id));
    return data;
  };

  return { proveedores, paginacion: listado.paginacion, cargando: listado.cargando,
    error: listado.error, refrescar: cargar, crear, actualizar, cambiarEstado, eliminar };
};

export default useProveedores;
