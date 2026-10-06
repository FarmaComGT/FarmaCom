import api from './axios';

export const obtenerHistorialExpediente = async (idExpediente) => {
  const { data } = await api.get(`/expedientes/${idExpediente}/bitacora`);
  return data;
};

export const obtenerHistorialPreciosProducto = async (idProducto) => {
  const { data: lotes } = await api.get(`/lotes/producto/${idProducto}`);

  const historiales = await Promise.all(
    lotes.map(async (lote) => {
      const { data } = await api.get(`/lotes/${lote.id_lote}/historial-precios`);
      return data.map((cambio) => ({
        ...cambio,
        id_lote: lote.id_lote,
        numero_lote: lote.numero_lote,
      }));
    }),
  );

  return historiales
    .flat()
    .sort((a, b) => new Date(b.fecha_cambio) - new Date(a.fecha_cambio));
};
