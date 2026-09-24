import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Info, LockKeyhole, X } from 'lucide-react';
import {
  crearPagoPOS,
  crearVenta,
  obtenerEstadoPagoPOS,
  obtenerVentaPorId,
} from '../../api/ventas';
import AutocompletadoProductosPOS from '../../components/ventas/AutocompletadoProductosPOS';
import CarritoVenta from '../../components/ventas/CarritoVenta';
import CobroModal from '../../components/ventas/CobroModal';
import ComprobanteModal from '../../components/ventas/ComprobanteModal';
import NuevoClienteModal from '../../components/ventas/NuevoClienteModal';
import VencimientoAvisoModal from '../../components/ventas/VencimientoAvisoModal';
import { useAuth } from '../../context/AuthContext';
import { useCarrito } from '../../context/CarritoContext';
import useAutocompletadoPOS from '../../hooks/useAutocompletadoPOS';
import useClientes from '../../hooks/useClientes';
import useCaja from '../../hooks/useCaja';

export default function PuntoVenta() {
  const { sucursalActivaId } = useAuth();
  const {
    cajas,
    cajaSeleccionada,
    idCajaSeleccionada,
    sesionActual,
    cargandoCajas,
    cargandoSesion,
    error: errorCaja,
    seleccionarCaja,
  } = useCaja(sucursalActivaId);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const {
    items,
    cantidadTotal,
    total,
    agregarAlCarrito,
    actualizarCantidad,
    incrementarCantidad,
    disminuirCantidad,
    eliminarDelCarrito,
    vaciarCarrito,
  } = useCarrito();
  const {
    productos,
    cargando,
    error,
    refrescar,
    buscarAhora,
  } = useAutocompletadoPOS(busquedaProducto);
  const {
    clientes,
    cargando: cargandoClientes,
    crear: crearCliente,
  } = useClientes();

  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [aviso, setAviso] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [productoPendiente, setProductoPendiente] = useState(null);
  const [confirmandoVenta, setConfirmandoVenta] = useState(false);
  const [mostrandoCobro, setMostrandoCobro] = useState(false);
  const [mostrandoNuevoCliente, setMostrandoNuevoCliente] = useState(false);
  const [procesandoCobro, setProcesandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState(null);
  const [ventaCompletada, setVentaCompletada] = useState(null);
  const [pagoPOS, setPagoPOS] = useState(null);
  const confirmandoPagoPOS = useRef(false);

  useEffect(() => {
    if (idCajaSeleccionada || cargandoCajas) return;
    const cajasAbiertas = cajas.filter((caja) => caja.id_sesion_abierta);
    if (cajasAbiertas.length === 1) {
      seleccionarCaja(cajasAbiertas[0].id_caja);
    }
  }, [cajas, cargandoCajas, idCajaSeleccionada, seleccionarCaja]);

  const agregarAlCarritoValidandoStock = useCallback((producto) => {
    const existente = items.find((item) => item.clave === producto.carritoKey);
    if (existente?.cantidad >= producto.stock_disponible) {
      setAviso(`No hay más existencias disponibles de ${producto.nombre_comercial}.`);
      return;
    }

    agregarAlCarrito(producto, { precioUnitario: producto.precio_venta });
    setAviso(null);
  }, [agregarAlCarrito, items]);

  const agregarProducto = useCallback((producto) => {
    if (producto.estado_vencimiento === 'proximo_a_vencer') {
      setProductoPendiente(producto);
      return;
    }

    agregarAlCarritoValidandoStock(producto);
  }, [agregarAlCarritoValidandoStock]);

  const confirmarAgregarPendiente = useCallback(() => {
    if (!productoPendiente) return;
    agregarAlCarritoValidandoStock(productoPendiente);
    setProductoPendiente(null);
  }, [productoPendiente, agregarAlCarritoValidandoStock]);

  const incrementarProducto = useCallback((item) => {
    if (item.cantidad >= item.stock_disponible) {
      setAviso(`Solo hay ${item.stock_disponible} unidades disponibles en este lote.`);
      return;
    }

    incrementarCantidad(item.clave);
    setAviso(null);
  }, [incrementarCantidad]);

  const disminuirProducto = useCallback((item) => {
    disminuirCantidad(item.clave);
    setAviso(null);
  }, [disminuirCantidad]);

  const actualizarCantidadProducto = useCallback((item, cantidad) => {
    const cantidadSolicitada = Number(cantidad);
    if (!Number.isFinite(cantidadSolicitada)) {
      setAviso('Ingresa una cantidad válida.');
      return;
    }

    const cantidadNormalizada = Math.max(
      0,
      Math.min(Math.floor(cantidadSolicitada), item.stock_disponible),
    );

    if (cantidadSolicitada > item.stock_disponible) {
      setAviso(`Solo hay ${item.stock_disponible} unidades disponibles en este lote.`);
    } else {
      setAviso(null);
    }

    actualizarCantidad(item.clave, cantidadNormalizada);
  }, [actualizarCantidad]);

  const eliminarProducto = useCallback((item) => {
    eliminarDelCarrito(item.clave);
    setAviso(null);
  }, [eliminarDelCarrito]);

  const itemsProximosAVencer = items.filter(
    (item) => item.estado_vencimiento === 'proximo_a_vencer',
  );

  const abrirCobro = useCallback(() => {
    setErrorCobro(null);
    setPagoPOS(null);
    setMostrandoCobro(true);
    setConfirmandoVenta(false);
  }, []);

  const procesarVenta = () => {
    if (!sesionActual?.id_sesion_caja) {
      setAviso('Selecciona una caja con un turno abierto antes de procesar la venta.');
      return;
    }

    if (itemsProximosAVencer.length > 0) {
      setConfirmandoVenta(true);
      return;
    }

    abrirCobro();
  };

  const agregarCliente = useCallback(async (datosCliente) => {
    const nuevoCliente = await crearCliente(datosCliente);
    setClienteSeleccionado(nuevoCliente);
    setMostrandoNuevoCliente(false);
    setAviso(`Cliente ${nuevoCliente.nombre_cliente} agregado y seleccionado.`);
  }, [crearCliente]);

  const cerrarCobro = useCallback(() => {
    if (procesandoCobro || pagoPOS?.external_id) return;
    setMostrandoCobro(false);
    setErrorCobro(null);
    setPagoPOS(null);
  }, [pagoPOS, procesandoCobro]);

  const cambiarMetodoPago = useCallback((metodo) => {
    setMetodoPago(metodo);
    setPagoPOS(null);
    setErrorCobro(null);
  }, []);

  const construirPayloadBaseVenta = useCallback(() => {
    const detalles = items.map((item) => ({
      id_lote: Number(item.id_lote),
      cantidad: Number(item.cantidad),
    }));

    if (!sucursalActivaId) {
      throw new Error('No hay una sucursal activa para registrar la venta.');
    }

    if (detalles.some((detalle) => !detalle.id_lote || detalle.cantidad <= 0)) {
      throw new Error('El carrito contiene productos sin lote valido.');
    }

    return {
      id_sucursal: Number(sucursalActivaId),
      id_sesion_caja: Number(sesionActual.id_sesion_caja),
      id_cliente: clienteSeleccionado?.id_cliente ?? null,
      detalles,
    };
  }, [clienteSeleccionado, items, sesionActual, sucursalActivaId]);

  const iniciarPagoPOS = useCallback(async () => {
    if (metodoPago !== 'tarjeta') {
      setErrorCobro('Selecciona tarjeta para enviar el cobro al POS.');
      return;
    }

    if (procesandoCobro || pagoPOS?.external_id) return;

    setErrorCobro(null);

    try {
      setProcesandoCobro(true);
      const pago = await crearPagoPOS(construirPayloadBaseVenta());

      if (!pago?.external_id) {
        throw new Error('No se pudo iniciar el pago. Inténtalo de nuevo.');
      }

      setPagoPOS(pago);
    } catch (err) {
      setErrorCobro(err.message || 'No se pudo enviar el cobro al POS.');
    } finally {
      setProcesandoCobro(false);
    }
  }, [construirPayloadBaseVenta, metodoPago, pagoPOS, procesandoCobro]);

  useEffect(() => {
    if (!mostrandoCobro || metodoPago !== 'tarjeta' || !pagoPOS?.external_id) {
      return undefined;
    }

    let activo = true;
    let temporizador;
    const externalId = pagoPOS.external_id;

    const detenerConsulta = () => {
      activo = false;
      if (temporizador) window.clearInterval(temporizador);
    };

    const consultarEstado = async () => {
      try {
        const pagoActualizado = await obtenerEstadoPagoPOS(externalId);
        if (!activo) return;

        setErrorCobro(null);
        setPagoPOS((pagoAnterior) => ({
          ...pagoAnterior,
          ...pagoActualizado,
        }));

        if (['fallido', 'rechazado', 'cancelado'].includes(pagoActualizado.estado)) {
          detenerConsulta();
          setPagoPOS(null);
          setErrorCobro('El pago no se completó. Puedes intentarlo nuevamente.');
          return;
        }

        if (
          pagoActualizado.estado !== 'pagado'
          || !pagoActualizado.id_venta
          || confirmandoPagoPOS.current
        ) {
          return;
        }

        confirmandoPagoPOS.current = true;

        try {
          const venta = await obtenerVentaPorId(pagoActualizado.id_venta);
          if (!activo) return;

          detenerConsulta();
          vaciarCarrito();
          setMostrandoCobro(false);
          setPagoPOS(null);
          setErrorCobro(null);
          setVentaCompletada(venta);
          refrescar();
        } catch (err) {
          if (activo) {
            setErrorCobro(err.message || 'No se pudo cargar el comprobante de la venta.');
          }
        } finally {
          confirmandoPagoPOS.current = false;
        }
      } catch (err) {
        // Los errores temporales se reintentan en la siguiente consulta.
        if (activo) {
          setErrorCobro(err.message || 'No se pudo verificar el estado del pago.');
        }
      }
    };

    temporizador = window.setInterval(consultarEstado, 2000);
    consultarEstado();

    return detenerConsulta;
  }, [metodoPago, mostrandoCobro, pagoPOS?.external_id, refrescar, vaciarCarrito]);

  const confirmarCobro = useCallback(async ({ montoRecibido } = {}) => {
    if (metodoPago !== 'efectivo') {
      setErrorCobro('Los pagos con tarjeta deben confirmarse desde el POS.');
      return;
    }

    setErrorCobro(null);

    try {
      setProcesandoCobro(true);
      const venta = await crearVenta({
        ...construirPayloadBaseVenta(),
        metodo_pago: metodoPago,
        monto_recibido: montoRecibido,
      });

      vaciarCarrito();
      setMostrandoCobro(false);
      setVentaCompletada(venta);
      setPagoPOS(null);
      refrescar();
    } catch (err) {
      setErrorCobro(err.message || 'No se pudo registrar la venta.');
    } finally {
      setProcesandoCobro(false);
    }
  }, [
    construirPayloadBaseVenta,
    metodoPago,
    refrescar,
    vaciarCarrito,
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <label htmlFor="caja-punto-venta" className="text-sm font-bold text-slate-700">
              Caja para esta venta
            </label>
            <div className="relative mt-1 max-w-md">
              <select
                id="caja-punto-venta"
                value={idCajaSeleccionada || ''}
                onChange={(evento) => seleccionarCaja(evento.target.value || null)}
                disabled={cargandoCajas || cajas.length === 0}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-12 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {cargandoCajas ? 'Cargando cajas...' : 'Selecciona una caja'}
                </option>
                {cajas.map((caja) => (
                  <option key={caja.id_caja} value={caja.id_caja}>
                    {caja.nombre}{caja.id_sesion_abierta ? ' — turno abierto' : ' — sin turno'}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
            sesionActual
              ? 'border border-primary/15 bg-primary/5 text-primary'
              : 'border border-slate-200 bg-slate-50 text-slate-500'
          }`}>
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            {cargandoSesion
              ? 'Verificando turno...'
              : sesionActual
                ? `Turno ${sesionActual.turno} activo`
                : cajaSeleccionada
                  ? 'Esta caja no tiene un turno abierto'
                  : 'Selecciona una caja'}
          </div>
        </div>
        {errorCaja && <p className="mt-2 text-sm font-semibold text-red-600">{errorCaja}</p>}
      </section>

      {aviso && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            {aviso}
          </span>
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Cerrar aviso"
            className="rounded-lg p-1 hover:bg-white/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid w-full items-stretch gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(390px,0.65fr)]">
        <AutocompletadoProductosPOS
          busqueda={busquedaProducto}
          onBusquedaChange={setBusquedaProducto}
          productos={productos}
          cargando={cargando}
          error={error}
          onAgregar={agregarProducto}
          onBuscarAhora={buscarAhora}
          onRefrescar={refrescar}
        />

        <CarritoVenta
          items={items}
          total={total}
          cantidadTotal={cantidadTotal}
          metodoPago={metodoPago}
          onMetodoPagoChange={cambiarMetodoPago}
          clientes={clientes}
          cargandoClientes={cargandoClientes}
          clienteSeleccionado={clienteSeleccionado}
          onClienteChange={setClienteSeleccionado}
          onNuevoCliente={() => setMostrandoNuevoCliente(true)}
          onIncrementar={incrementarProducto}
          onDisminuir={disminuirProducto}
          onActualizarCantidad={actualizarCantidadProducto}
          onEliminar={eliminarProducto}
          onLimpiar={vaciarCarrito}
          onProcesar={procesarVenta}
        />
      </div>

      <NuevoClienteModal
        isOpen={mostrandoNuevoCliente}
        onClose={() => setMostrandoNuevoCliente(false)}
        onCrear={agregarCliente}
      />

      <VencimientoAvisoModal
        isOpen={Boolean(productoPendiente)}
        productos={productoPendiente ? [productoPendiente] : []}
        titulo="Producto próximo a vencer"
        mensaje="Este producto está próximo a vencer. ¿Deseas agregarlo de todas formas al carrito?"
        onClose={() => setProductoPendiente(null)}
        onConfirm={confirmarAgregarPendiente}
      />

      <VencimientoAvisoModal
        isOpen={confirmandoVenta}
        productos={itemsProximosAVencer}
        titulo="Venta con productos próximos a vencer"
        mensaje="El carrito incluye productos próximos a vencer. ¿Deseas continuar con la venta?"
        onClose={() => setConfirmandoVenta(false)}
        onConfirm={abrirCobro}
      />

      <CobroModal
        isOpen={mostrandoCobro}
        items={items}
        total={total}
        metodoPago={metodoPago}
        clienteSeleccionado={clienteSeleccionado}
        pagoPOS={pagoPOS}
        procesando={procesandoCobro}
        error={errorCobro}
        onClose={cerrarCobro}
        onCrearPagoPOS={iniciarPagoPOS}
        onConfirm={confirmarCobro}
      />

      <ComprobanteModal
        isOpen={Boolean(ventaCompletada)}
        venta={ventaCompletada}
        onClose={() => setVentaCompletada(null)}
      />
    </div>
  );
}
