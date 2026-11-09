import { useEffect } from 'react';
import { obtenerEstadoPagoPOS } from '../api/ventas.js';

export const ESTADOS_PAGO_NO_COMPLETADO = new Set(['fallido', 'rechazado', 'cancelado']);
export const ESTADOS_PAGO_EN_SEGUIMIENTO = new Set(['pendiente', 'procesando']);

const INTERVALO_SEGUIMIENTO_MS = 2000;

export default function useSeguimientoPagoPOS({
  activo,
  externalId,
  onEstado,
  onError,
}) {
  useEffect(() => {
    if (!activo || !externalId) return undefined;

    let cancelado = false;
    let temporizador = null;

    const programarSiguiente = () => {
      if (!cancelado) temporizador = window.setTimeout(consultar, INTERVALO_SEGUIMIENTO_MS);
    };

    const consultar = async () => {
      try {
        const pago = await obtenerEstadoPagoPOS(externalId);
        if (cancelado) return;
        const continuar = await onEstado(pago);
        if (continuar !== false) programarSiguiente();
      } catch (error) {
        if (cancelado) return;
        onError(error);
        programarSiguiente();
      }
    };

    consultar();
    return () => {
      cancelado = true;
      if (temporizador) window.clearTimeout(temporizador);
    };
  }, [activo, externalId, onError, onEstado]);
}
