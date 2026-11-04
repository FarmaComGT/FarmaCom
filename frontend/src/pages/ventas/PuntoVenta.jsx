import { useToast } from '../../context/ToastContext.jsx';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './PuntoVenta.css';
import AvisoPuntoVenta from '../../components/ventas/AvisoPuntoVenta';
import CajaVentaContexto from '../../components/ventas/CajaVentaContexto';
import AutocompletadoProductosPOS from '../../components/ventas/AutocompletadoProductosPOS';
import CarritoVenta from '../../components/ventas/CarritoVenta';
import CarritosVentaBar from '../../components/ventas/CarritosVentaBar';
import CobroModal from '../../components/ventas/CobroModal';
import ComprobanteModal from '../../components/ventas/ComprobanteModal';
import NuevoClienteModal from '../../components/ventas/NuevoClienteModal';
import SeleccionLoteModal from '../../components/ventas/SeleccionLoteModal';
import VencimientoAvisoModal from '../../components/ventas/VencimientoAvisoModal';
import { useAuth } from '../../context/AuthContext';
import { useCarrito } from '../../context/CarritoContext';
import useAutocompletadoPOS from '../../hooks/useAutocompletadoPOS';
import useClientes from '../../hooks/useClientes';
import useCaja from '../../hooks/useCaja';
import useSeleccionCajaVenta from '../../hooks/useSeleccionCajaVenta';
import useFlujoVenta from '../../hooks/useFlujoVenta';
import { normalizarCantidadCarrito, validarProductoAgregable } from '../../utils/carritoVenta';
import { crearItemLotePOS } from '../../utils/pos';

export default function PuntoVenta() {
  const toast = useToast();
  const { sucursalActivaId } = useAuth();
  const [parametros, setParametros] = useSearchParams();
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
  const busquedaProducto = parametros.get('q') || '';
  const productoIdEnUrl = parametros.get('producto');
  const carritoIdEnUrl = parametros.get('carrito');
  const {
    carritos,
    carritoActivoId,
    items,
    cantidadTotal,
    total,
    agregarAlCarrito,
    actualizarCantidad,
    incrementarCantidad,
    disminuirCantidad,
    eliminarDelCarrito,
    vaciarCarrito,
    clienteSeleccionado,
    seleccionarCliente,
    crearCarrito,
    cambiarCarrito,
    renombrarCarrito,
    cerrarCarrito,
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

  const [aviso, setAviso] = useState(null);
  const [productoSeleccionandoLote, setProductoSeleccionandoLote] = useState(null);
  const [productoPendiente, setProductoPendiente] = useState(null);
  const [mostrandoNuevoCliente, setMostrandoNuevoCliente] = useState(false);

  useEffect(() => {
    document.title = 'Punto de venta · FarmaCom';
  }, []);

  const actualizarBusquedaProducto = useCallback((valor) => {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (valor) siguientes.set('q', valor);
      else siguientes.delete('q');
      return siguientes;
    }, { replace: true });
  }, [setParametros]);

  const abrirSeleccionLote = useCallback((producto) => {
    setProductoSeleccionandoLote(producto);
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.set('producto', String(producto.id_producto));
      return siguientes;
    });
  }, [setParametros]);

  const cerrarSeleccionLote = useCallback(() => {
    setProductoSeleccionandoLote(null);
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.delete('producto');
      return siguientes;
    }, { replace: true });
  }, [setParametros]);

  const actualizarCarritoEnUrl = useCallback((idCarrito, reemplazar = false) => {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (idCarrito) siguientes.set('carrito', String(idCarrito));
      else siguientes.delete('carrito');
      return siguientes;
    }, { replace: reemplazar });
  }, [setParametros]);

  const crearCarritoVenta = useCallback(() => {
    const idCarrito = crearCarrito();
    if (idCarrito) actualizarCarritoEnUrl(idCarrito);
  }, [actualizarCarritoEnUrl, crearCarrito]);

  const cambiarCarritoVenta = useCallback((idCarrito) => {
    cambiarCarrito(idCarrito);
    actualizarCarritoEnUrl(idCarrito);
  }, [actualizarCarritoEnUrl, cambiarCarrito]);

  const cerrarCarritoVenta = useCallback((idCarrito) => {
    cerrarCarrito(idCarrito);
    if (String(idCarrito) === String(carritoActivoId)) actualizarCarritoEnUrl(null, true);
  }, [actualizarCarritoEnUrl, carritoActivoId, cerrarCarrito]);

  useEffect(() => {
    if (!productoIdEnUrl || productoSeleccionandoLote) return;
    const producto = productos.find(
      (opcion) => String(opcion.id_producto) === String(productoIdEnUrl),
    );
    if (producto) setProductoSeleccionandoLote(producto);
  }, [productoIdEnUrl, productoSeleccionandoLote, productos]);

  useEffect(() => {
    const carritoExiste = carritos.some(
      (carrito) => String(carrito.id) === String(carritoIdEnUrl),
    );
    if (carritoIdEnUrl && carritoExiste) {
      if (String(carritoActivoId) !== String(carritoIdEnUrl)) cambiarCarrito(carritoIdEnUrl);
      return;
    }
    if (carritoActivoId) actualizarCarritoEnUrl(carritoActivoId, true);
  }, [actualizarCarritoEnUrl, cambiarCarrito, carritoActivoId, carritoIdEnUrl, carritos]);

  const { estadoTurno } = useSeleccionCajaVenta({
    cajas, idCajaSeleccionada, cajaSeleccionada, sesionActual, cargandoCajas,
    cargandoSesion, seleccionarCaja,
  });
  const flujoVenta = useFlujoVenta({
    items,
    sucursalId: sucursalActivaId,
    sesionCajaId: sesionActual?.id_sesion_caja,
    clienteId: clienteSeleccionado?.id_cliente,
    vaciarCarrito,
    refrescarCatalogo: refrescar,
    onAviso: setAviso,
    onExito: toast.success,
    onError: toast.error,
  });

  const agregarAlCarritoValidandoStock = useCallback((producto) => {
    const errorStock = validarProductoAgregable(items, producto);
    if (errorStock) {
      setAviso(errorStock);
      return;
    }

    agregarAlCarrito(producto, { precioUnitario: producto.precio_venta });
    setAviso(null);
  }, [agregarAlCarrito, items]);

  const seleccionarLote = useCallback((lote) => {
    if (!productoSeleccionandoLote) return;
    const itemLote = crearItemLotePOS(productoSeleccionandoLote, lote);
    cerrarSeleccionLote();

    if (itemLote.estado_vencimiento === 'proximo_a_vencer') {
      setProductoPendiente(itemLote);
      return;
    }

    agregarAlCarritoValidandoStock(itemLote);
  }, [agregarAlCarritoValidandoStock, cerrarSeleccionLote, productoSeleccionandoLote]);

  const confirmarAgregarPendiente = useCallback(() => {
    if (!productoPendiente) return;
    agregarAlCarritoValidandoStock(productoPendiente);
    setProductoPendiente(null);
  }, [productoPendiente, agregarAlCarritoValidandoStock]);

  const incrementarProducto = useCallback((item) => {
    if (item.cantidad >= item.stock_disponible) {
      setAviso(
        `Solo hay ${item.stock_disponible} unidades disponibles en el lote ${item.numero_lote}.`,
      );
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
    const resultado = normalizarCantidadCarrito(cantidad, item.stock_disponible);
    if (resultado.cantidad == null) {
      setAviso(resultado.aviso);
      return;
    }
    setAviso(resultado.aviso);
    actualizarCantidad(item.clave, resultado.cantidad);
  }, [actualizarCantidad]);

  const eliminarProducto = useCallback((item) => {
    eliminarDelCarrito(item.clave);
    setAviso(null);
  }, [eliminarDelCarrito]);

  const agregarCliente = useCallback(async (datosCliente) => {
    const nuevoCliente = await crearCliente(datosCliente);
    seleccionarCliente(nuevoCliente);
    setMostrandoNuevoCliente(false);
    toast.success(`Cliente ${nuevoCliente.nombre_cliente} agregado y seleccionado.`);
  }, [crearCliente, seleccionarCliente, toast]);

  return (
    <div className="pos-page">
      <header className="pos-heading">
        <div>
          <h1>Punto de venta</h1>
          <p>Vende productos y cobra en caja</p>
        </div>
        <CajaVentaContexto
          cajas={cajas}
          idCaja={idCajaSeleccionada}
          sesionActiva={Boolean(sesionActual)}
          cargandoCajas={cargandoCajas}
          estadoTurno={estadoTurno}
          error={errorCaja}
          onSeleccionar={seleccionarCaja}
        />
      </header>

      <AvisoPuntoVenta mensaje={aviso} onCerrar={() => setAviso(null)} />

      <CarritosVentaBar
        carritos={carritos}
        carritoActivoId={carritoActivoId}
        bloqueado={Boolean(flujoVenta.modalActivo) || flujoVenta.procesandoCobro}
        onCrear={crearCarritoVenta}
        onCambiar={cambiarCarritoVenta}
        onRenombrar={renombrarCarrito}
        onCerrar={cerrarCarritoVenta}
      />

      <div className="pos-grid">
        <AutocompletadoProductosPOS
          busqueda={busquedaProducto}
          onBusquedaChange={actualizarBusquedaProducto}
          productos={productos}
          cargando={cargando}
          error={error}
          onSeleccionar={abrirSeleccionLote}
          onBuscarAhora={buscarAhora}
          onRefrescar={refrescar}
        />

        <CarritoVenta
          carritoId={carritoActivoId}
          items={items}
          total={total}
          cantidadTotal={cantidadTotal}
          metodoPago={flujoVenta.metodoPago}
          onMetodoPagoChange={flujoVenta.cambiarMetodoPago}
          clientes={clientes}
          cargandoClientes={cargandoClientes}
          clienteSeleccionado={clienteSeleccionado}
          onClienteChange={seleccionarCliente}
          onNuevoCliente={() => setMostrandoNuevoCliente(true)}
          onIncrementar={incrementarProducto}
          onDisminuir={disminuirProducto}
          onActualizarCantidad={actualizarCantidadProducto}
          onEliminar={eliminarProducto}
          onLimpiar={vaciarCarrito}
          onProcesar={flujoVenta.procesarVenta}
        />
      </div>

      <NuevoClienteModal
        isOpen={mostrandoNuevoCliente}
        onClose={() => setMostrandoNuevoCliente(false)}
        onCrear={agregarCliente}
      />

      <SeleccionLoteModal
        producto={productoSeleccionandoLote}
        onClose={cerrarSeleccionLote}
        onSeleccionar={seleccionarLote}
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
        isOpen={flujoVenta.modalActivo === 'confirmar_vencimiento'}
        productos={flujoVenta.itemsProximosAVencer}
        titulo="Venta con productos próximos a vencer"
        mensaje="El carrito incluye productos próximos a vencer. ¿Deseas continuar con la venta?"
        onClose={flujoVenta.cerrarConfirmacion}
        onConfirm={flujoVenta.abrirCobro}
      />

      <CobroModal
        isOpen={flujoVenta.modalActivo === 'cobro'}
        items={items}
        total={total}
        metodoPago={flujoVenta.metodoPago}
        clienteSeleccionado={clienteSeleccionado}
        pagoPOS={flujoVenta.pagoPOS}
        procesando={flujoVenta.procesandoCobro}
        error={flujoVenta.errorCobro}
        onClose={flujoVenta.cerrarCobro}
        onCrearPagoPOS={flujoVenta.iniciarPagoPOS}
        onConfirm={flujoVenta.confirmarCobro}
      />

      <ComprobanteModal
        isOpen={flujoVenta.modalActivo === 'comprobante'}
        venta={flujoVenta.ventaCompletada}
        onClose={flujoVenta.cerrarComprobante}
      />
    </div>
  );
}
