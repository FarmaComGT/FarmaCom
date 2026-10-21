import { useCallback, useEffect, useRef, useState } from 'react';
import { crearPagoPOS, crearVenta, obtenerEstadoPagoPOS, obtenerVentaPorId } from '../api/ventas.js';

export const construirPayloadVenta = ({ items, sucursalId, sesionCajaId, clienteId }) => {
  if (!sucursalId) throw new Error('No hay una sucursal activa para registrar la venta.');
  if (!sesionCajaId) throw new Error('Selecciona una caja con un turno abierto antes de procesar la venta.');
  const detalles = items.map((item) => ({ id_lote: Number(item.id_lote), cantidad: Number(item.cantidad) }));
  if (detalles.some((detalle) => !detalle.id_lote || detalle.cantidad <= 0)) {
    throw new Error('El carrito contiene productos sin lote válido.');
  }
  return { id_sucursal: Number(sucursalId), id_sesion_caja: Number(sesionCajaId), id_cliente: clienteId ?? null, detalles };
};

export default function useFlujoVenta({
  items, sucursalId, sesionCajaId, clienteId, vaciarCarrito, refrescarCatalogo, onAviso,
}) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [modalActivo, setModalActivo] = useState(null);
  const [procesandoCobro, setProcesandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState(null);
  const [ventaCompletada, setVentaCompletada] = useState(null);
  const [pagoPOS, setPagoPOS] = useState(null);
  const confirmandoPago = useRef(false);
  const itemsProximosAVencer = items.filter((item) => item.estado_vencimiento === 'proximo_a_vencer');

  const payloadBase = useCallback(() => construirPayloadVenta({ items, sucursalId, sesionCajaId, clienteId }), [clienteId, items, sesionCajaId, sucursalId]);
  const abrirCobro = useCallback(() => { setErrorCobro(null); setPagoPOS(null); setModalActivo('cobro'); }, []);
  const procesarVenta = useCallback(() => {
    if (!sesionCajaId) { onAviso('Selecciona una caja con un turno abierto antes de procesar la venta.'); return; }
    if (itemsProximosAVencer.length) { setModalActivo('confirmar_vencimiento'); return; }
    abrirCobro();
  }, [abrirCobro, itemsProximosAVencer.length, onAviso, sesionCajaId]);
  const cerrarCobro = useCallback(() => {
    if (procesandoCobro || pagoPOS?.external_id) return;
    setModalActivo(null); setErrorCobro(null); setPagoPOS(null);
  }, [pagoPOS, procesandoCobro]);
  const cambiarMetodoPago = useCallback((metodo) => { setMetodoPago(metodo); setPagoPOS(null); setErrorCobro(null); }, []);
  const completarVenta = useCallback((venta) => {
    vaciarCarrito(); setModalActivo('comprobante'); setPagoPOS(null); setErrorCobro(null);
    setVentaCompletada(venta); refrescarCatalogo();
  }, [refrescarCatalogo, vaciarCarrito]);
  const iniciarPagoPOS = useCallback(async () => {
    if (metodoPago !== 'tarjeta') { setErrorCobro('Selecciona tarjeta para enviar el cobro al POS.'); return; }
    if (procesandoCobro || pagoPOS?.external_id) return;
    setErrorCobro(null); setProcesandoCobro(true);
    try {
      const pago = await crearPagoPOS(payloadBase());
      if (!pago?.external_id) throw new Error('No se pudo iniciar el pago. Inténtalo de nuevo.');
      setPagoPOS(pago);
    } catch (error) { setErrorCobro(error.message || 'No se pudo enviar el cobro al POS.'); }
    finally { setProcesandoCobro(false); }
  }, [metodoPago, pagoPOS, payloadBase, procesandoCobro]);
  const confirmarCobro = useCallback(async ({ montoRecibido } = {}) => {
    if (metodoPago !== 'efectivo') { setErrorCobro('Los pagos con tarjeta deben confirmarse desde el POS.'); return; }
    setErrorCobro(null); setProcesandoCobro(true);
    try {
      const venta = await crearVenta({ ...payloadBase(), metodo_pago: metodoPago, monto_recibido: montoRecibido });
      completarVenta(venta);
    } catch (error) { setErrorCobro(error.message || 'No se pudo registrar la venta.'); }
    finally { setProcesandoCobro(false); }
  }, [completarVenta, metodoPago, payloadBase]);

  useEffect(() => {
    if (modalActivo !== 'cobro' || metodoPago !== 'tarjeta' || !pagoPOS?.external_id) return undefined;
    let activo = true; let temporizador;
    const detener = () => { activo = false; if (temporizador) window.clearInterval(temporizador); };
    const consultar = async () => {
      try {
        const pago = await obtenerEstadoPagoPOS(pagoPOS.external_id);
        if (!activo) return;
        setErrorCobro(null); setPagoPOS((anterior) => ({ ...anterior, ...pago }));
        if (['fallido', 'rechazado', 'cancelado'].includes(pago.estado)) {
          detener(); setPagoPOS(null); setErrorCobro('El pago no se completó. Puedes intentarlo nuevamente.'); return;
        }
        if (pago.estado !== 'pagado' || !pago.id_venta || confirmandoPago.current) return;
        confirmandoPago.current = true;
        try { const venta = await obtenerVentaPorId(pago.id_venta); if (activo) { detener(); completarVenta(venta); } }
        catch (error) { if (activo) setErrorCobro(error.message || 'No se pudo cargar el comprobante de la venta.'); }
        finally { confirmandoPago.current = false; }
      } catch (error) { if (activo) setErrorCobro(error.message || 'No se pudo verificar el estado del pago.'); }
    };
    temporizador = window.setInterval(consultar, 2000); consultar();
    return detener;
  }, [completarVenta, metodoPago, modalActivo, pagoPOS?.external_id]);

  return {
    metodoPago, modalActivo, procesandoCobro, errorCobro, ventaCompletada, pagoPOS,
    itemsProximosAVencer, cambiarMetodoPago, procesarVenta, abrirCobro, cerrarCobro,
    iniciarPagoPOS, confirmarCobro, cerrarConfirmacion: () => setModalActivo(null),
    cerrarComprobante: () => { setModalActivo(null); setVentaCompletada(null); },
  };
}
