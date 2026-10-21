import { useEffect, useMemo } from 'react';

export default function useSeleccionCajaVenta({
  cajas,
  idCajaSeleccionada,
  cajaSeleccionada,
  sesionActual,
  cargandoCajas,
  cargandoSesion,
  seleccionarCaja,
}) {
  useEffect(() => {
    if (idCajaSeleccionada || cargandoCajas) return;
    const cajasAbiertas = cajas.filter((caja) => caja.id_sesion_abierta);
    if (cajasAbiertas.length === 1) seleccionarCaja(cajasAbiertas[0].id_caja);
  }, [cajas, cargandoCajas, idCajaSeleccionada, seleccionarCaja]);

  const estadoTurno = useMemo(() => {
    if (cargandoSesion) return 'Verificando turno...';
    if (sesionActual) return `Turno ${sesionActual.turno} activo`;
    if (cajaSeleccionada) return 'Esta caja no tiene un turno abierto';
    return 'Selecciona una caja';
  }, [cajaSeleccionada, cargandoSesion, sesionActual]);

  return {
    puedeIniciarVenta: Boolean(sesionActual?.id_sesion_caja),
    estadoTurno,
  };
}
