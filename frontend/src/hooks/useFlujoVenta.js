import { useCallback, useEffect, useRef, useState } from 'react';
import {
  conciliarPagoPOS,
  crearPagoPOS,
  crearVenta,
  obtenerVentaPorId,
} from '../api/ventas.js';
import useSeguimientoPagoPOS, {
  ESTADOS_PAGO_NO_COMPLETADO,
} from './useSeguimientoPagoPOS.js';

export const construirPayloadVenta = ({
  items, sucursalId, sesionCajaId, clienteId,
}) => {
  if (!sucursalId) throw new Error('No hay una sucursal activa para registrar la venta.');
  if (!sesionCajaId) throw new Error('Selecciona una caja con un turno abierto antes de procesar la venta.');
  const detalles = items.map((item) => {
    const idLote = Number(item.id_lote);
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(idLote) || idLote <= 0) {
      throw new Error('El carrito contiene productos sin lote válido.');
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error('El carrito contiene una cantidad inválida.');
    }
    return { id_lote: idLote, cantidad };
  });
  const total = items.every((item) => Number.isFinite(item.subtotalItem))
    ? { total_esperado: (items.reduce((suma, item) => suma + Math.round(item.subtotalItem * 100), 0) / 100).toFixed(2) } : {};
  return { id_sucursal: Number(sucursalId), id_sesion_caja: Number(sesionCajaId), id_cliente: clienteId ?? null, detalles, ...total };
};

export const crearClaveIdempotencia = () => globalThis.crypto.randomUUID();

export default function useFlujoVenta({
  items, sucursalId, sesionCajaId, clienteId, carritoId, pagosPOSAbiertos = [],
  vaciarCarrito, refrescarCatalogo, actualizarCotizacion, onRecuperarCarrito,
  onAviso, onExito, onError,
}) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [modalActivo, setModalActivo] = useState(null);
  const [procesandoCobro, setProcesandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState(null);
  const [ventaCompletada, setVentaCompletada] = useState(null);
  const [pagoPOS, setPagoPOS] = useState(null);
  const intentoEfectivo = useRef(null);
  const carritoOrigen = useRef(carritoId || null);
  const itemsProximosAVencer = items.filter((item) => item.estado_vencimiento === 'proximo_a_vencer');

  useEffect(() => {
    const pagoRecuperable = pagosPOSAbiertos.find((pago) => (
      ['pendiente', 'procesando', 'incidencia'].includes(pago.estado)
    ));
    if (!pagoRecuperable || pagoPOS?.external_id) return;
    carritoOrigen.current = pagoRecuperable.carrito_origen_id || carritoId || null;
    if (pagoRecuperable.carrito_origen_id) {
      onRecuperarCarrito?.(pagoRecuperable.carrito_origen_id);
    }
    setMetodoPago('tarjeta');
    setPagoPOS(pagoRecuperable);
    setModalActivo('cobro');
    setErrorCobro(pagoRecuperable.estado === 'incidencia'
      ? 'El cobro fue confirmado, pero la venta quedó pendiente. No vuelvas a cobrar; concilia esta operación.'
      : null);
  }, [carritoId, onRecuperarCarrito, pagosPOSAbiertos, pagoPOS?.external_id]);

  useEffect(() => {
    if (!pagoPOS?.external_id) carritoOrigen.current = carritoId || null;
  }, [carritoId, pagoPOS?.external_id]);

  const payloadBase = useCallback(() => construirPayloadVenta({
    items, sucursalId, sesionCajaId, clienteId,
  }), [clienteId, items, sesionCajaId, sucursalId]);
  const abrirCobro = useCallback(() => { setErrorCobro(null); setPagoPOS(null); setModalActivo('cobro'); }, []);
  const procesarVenta = useCallback(() => {
    if (!sesionCajaId) { onAviso('Selecciona una caja con un turno abierto antes de procesar la venta.'); return; }
    if (itemsProximosAVencer.length) { setModalActivo('confirmar_vencimiento'); return; }
    abrirCobro();
  }, [abrirCobro, itemsProximosAVencer.length, onAviso, sesionCajaId]);
  const cerrarCobro = useCallback(() => {
    if (procesandoCobro || (pagoPOS?.external_id && pagoPOS.estado !== 'incidencia')) return;
    setModalActivo(null); setErrorCobro(null); setPagoPOS(null);
  }, [pagoPOS, procesandoCobro]);
  const cambiarMetodoPago = useCallback((metodo) => { setMetodoPago(metodo); setPagoPOS(null); setErrorCobro(null); }, []);
  const completarVenta = useCallback((venta) => {
    vaciarCarrito(carritoOrigen.current); setModalActivo('comprobante'); setPagoPOS(null); setErrorCobro(null);
    setVentaCompletada(venta); onExito?.('Venta registrada correctamente.');
    Promise.resolve().then(() => refrescarCatalogo()).catch(() => onError?.('La venta se registró, pero no se pudo actualizar el catálogo. Actualiza la vista.'));
  }, [refrescarCatalogo, vaciarCarrito, onExito, onError]);
  const iniciarPagoPOS = useCallback(async () => {
    if (metodoPago !== 'tarjeta') { setErrorCobro('Selecciona tarjeta para enviar el cobro al POS.'); return; }
    if (procesandoCobro || pagoPOS?.external_id) return;
    setErrorCobro(null); setProcesandoCobro(true);
    try {
      carritoOrigen.current = carritoId || null;
      const pago = await crearPagoPOS({
        ...payloadBase(),
        ...(carritoId ? { carrito_origen_id: String(carritoId) } : {}),
      });
      if (!pago?.external_id) throw new Error('No se pudo iniciar el pago. Inténtalo de nuevo.');
      setPagoPOS(pago);
    } catch (error) {
      if (error.cotizacion) { actualizarCotizacion?.(error.cotizacion.lotes); setErrorCobro(error.message); }
      else (onError || setErrorCobro)(error.message || 'No se pudo enviar el cobro al POS.');
    }
    finally { setProcesandoCobro(false); }
  }, [
    actualizarCotizacion,
    carritoId,
    metodoPago,
    onError,
    pagoPOS,
    payloadBase,
    procesandoCobro,
  ]);
  const confirmarCobro = useCallback(async ({ montoRecibido } = {}) => {
    if (metodoPago !== 'efectivo') { setErrorCobro('Los pagos con tarjeta deben confirmarse desde el POS.'); return; }
    setErrorCobro(null); setProcesandoCobro(true);
    try {
      carritoOrigen.current = carritoId || null;
      const payload = { ...payloadBase(), metodo_pago: metodoPago, monto_recibido: montoRecibido };
      const firma = JSON.stringify(payload);
      if (!intentoEfectivo.current || intentoEfectivo.current.firma !== firma) {
        intentoEfectivo.current = { firma, clave: crearClaveIdempotencia() };
      }
      const venta = await crearVenta(payload, intentoEfectivo.current.clave);
      intentoEfectivo.current = null;
      completarVenta(venta);
    } catch (error) {
      if (error.cotizacion) { actualizarCotizacion?.(error.cotizacion.lotes); setErrorCobro(error.message); }
      else (onError || setErrorCobro)(error.message || 'No se pudo registrar la venta.');
    }
    finally { setProcesandoCobro(false); }
  }, [
    actualizarCotizacion,
    carritoId,
    completarVenta,
    metodoPago,
    onError,
    payloadBase,
  ]);

  const conciliarVentaPOS = useCallback(async () => {
    if (procesandoCobro || pagoPOS?.estado !== 'incidencia' || !pagoPOS.external_id) return;
    setErrorCobro(null); setProcesandoCobro(true);
    try {
      const resultado = await conciliarPagoPOS(pagoPOS.external_id);
      if (!resultado?.id_venta) throw new Error('La conciliación no devolvió una venta registrada.');
      const venta = await obtenerVentaPorId(resultado.id_venta);
      completarVenta(venta);
    } catch (error) {
      setErrorCobro(error.message || 'No se pudo conciliar la venta. Conserva la referencia del cobro.');
    } finally {
      setProcesandoCobro(false);
    }
  }, [completarVenta, pagoPOS, procesandoCobro]);

  const procesarEstadoPago = useCallback(async (pago) => {
    setErrorCobro(null);
    setPagoPOS((anterior) => ({ ...anterior, ...pago }));
    if (pago.estado === 'incidencia') {
      setErrorCobro('El cobro fue confirmado, pero la venta quedó pendiente. No vuelvas a cobrar; concilia esta operación.');
      return false;
    }
    if (ESTADOS_PAGO_NO_COMPLETADO.has(pago.estado)) {
      setPagoPOS(null);
      setErrorCobro('El pago no se completó. Puedes intentarlo nuevamente.');
      return false;
    }
    if (pago.estado !== 'pagado' || !pago.id_venta) return true;
    try {
      const venta = await obtenerVentaPorId(pago.id_venta);
      completarVenta(venta);
      return false;
    } catch (error) {
      setErrorCobro(error.message || 'No se pudo cargar el comprobante de la venta.');
      return true;
    }
  }, [completarVenta]);

  const manejarErrorSeguimiento = useCallback((error) => {
    setErrorCobro(error.message || 'No se pudo verificar el estado del pago.');
  }, []);

  useSeguimientoPagoPOS({
    activo: modalActivo === 'cobro' && metodoPago === 'tarjeta',
    externalId: pagoPOS?.external_id,
    onEstado: procesarEstadoPago,
    onError: manejarErrorSeguimiento,
  });

  return {
    metodoPago, modalActivo, procesandoCobro, errorCobro, ventaCompletada, pagoPOS,
    itemsProximosAVencer, cambiarMetodoPago, procesarVenta, abrirCobro, cerrarCobro,
    iniciarPagoPOS, confirmarCobro, cerrarConfirmacion: () => setModalActivo(null),
    conciliarVentaPOS,
    cerrarComprobante: () => { setModalActivo(null); setVentaCompletada(null); },
  };
}
