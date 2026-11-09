import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function usePromocionReferencia(idProducto, idSucursal, enabled) {
  const [resultado, setResultado] = useState({ clave: '', precio: null, error: '' });
  const [intento, setIntento] = useState(0);
  const clave = enabled && idProducto && idSucursal ? `${idProducto}:${idSucursal}:${intento}` : '';
  useEffect(() => {
    if (!clave) return;
    const controller = new AbortController();
    api.get(`/productos/${idProducto}/promociones/referencia`, { params: { id_sucursal: idSucursal }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setResultado({ clave, precio: data.precio_minimo == null ? null : Number(data.precio_minimo), error: '' }); })
      .catch(() => { if (!controller.signal.aborted) setResultado({ clave, precio: null, error: 'No se pudo consultar el precio normal.' }); });
    return () => controller.abort();
  }, [clave, idProducto, idSucursal]);
  return { precio: resultado.clave === clave ? resultado.precio : null, error: resultado.clave === clave ? resultado.error : '',
    cargando: Boolean(clave && resultado.clave !== clave), reintentar: () => setIntento((valor) => valor + 1) };
}
