import React, { useEffect, useState } from 'react';
import { ReceiptText, ShoppingCart, Trash2 } from 'lucide-react';
import CarritoVentaItem from './CarritoVentaItem';
import ClienteVentaSection from './ClienteVentaSection';
import CarritoAccionesCobro from './CarritoAccionesCobro';
import ConfirmacionCarritoModal from './ConfirmacionCarritoModal';

export default function CarritoVenta({
  carritoId,
  items,
  total,
  cantidadTotal,
  metodoPago,
  onMetodoPagoChange,
  clientes,
  cargandoClientes,
  clienteSeleccionado,
  onClienteChange,
  onNuevoCliente,
  onIncrementar,
  onDisminuir,
  onActualizarCantidad,
  onEliminar,
  onLimpiar,
  onProcesar,
}) {
  const [confirmandoLimpieza, setConfirmandoLimpieza] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);

  useEffect(() => {
    if (items.length === 0) {
      setConfirmandoLimpieza(false);
      setItemAEliminar(null);
    }
  }, [items.length]);

  const confirmarLimpieza = () => {
    onLimpiar();
    setConfirmandoLimpieza(false);
  };

  const confirmarEliminacion = () => {
    if (!itemAEliminar) return;
    onEliminar(itemAEliminar);
    setItemAEliminar(null);
  };

  return (
    <section
      id={carritoId ? `panel-${carritoId}` : undefined}
      role={carritoId ? 'tabpanel' : undefined}
      aria-labelledby={carritoId ? `pestana-${carritoId}` : undefined}
      className="pos-panel"
    >
      <header className="pos-cart-panel-head">
        <div>
          <span className="pos-section-kicker">Carrito activo</span>
          <h2>
            <ShoppingCart aria-hidden="true" />
            Detalle del carrito
          </h2>
          <p aria-live="polite">
            {cantidadTotal} {cantidadTotal === 1 ? 'artículo' : 'artículos'}
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmandoLimpieza(true)}
            className="pos-clear-btn"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Vaciar
          </button>
        )}
      </header>

      <ClienteVentaSection clientes={clientes} cargando={cargandoClientes} seleccionado={clienteSeleccionado} onSeleccionar={onClienteChange} onNuevo={onNuevoCliente} />

      <div className="pos-cart-columns" aria-hidden="true">
        <span>Producto</span>
        <span>Cantidad</span>
        <span>Importe</span>
        <span />
      </div>

      <div className="pos-cart-items">
        {items.length === 0 ? (
          <div className="pos-cart-empty">
            <span className="pos-cart-empty-icon">
              <ReceiptText aria-hidden="true" />
            </span>
            <strong>El carrito está vacío</strong>
            <p>Busca y selecciona un producto para iniciar la venta.</p>
          </div>
        ) : (
          <ul aria-label="Productos del carrito">
            {items.map((item) => (
              <CarritoVentaItem
                key={item.clave}
                item={item}
                onIncrementar={onIncrementar}
                onDisminuir={onDisminuir}
                onActualizarCantidad={onActualizarCantidad}
                onEliminar={setItemAEliminar}
              />
            ))}
          </ul>
        )}
      </div>

      <CarritoAccionesCobro total={total} metodoPago={metodoPago} deshabilitado={items.length === 0} onMetodoPagoChange={onMetodoPagoChange} onProcesar={onProcesar} />

      <ConfirmacionCarritoModal
        abierto={confirmandoLimpieza}
        titulo="¿Vaciar este carrito?"
        descripcion="Se quitarán todos los productos agregados. Esta acción no se puede deshacer."
        detalle={`${cantidadTotal} ${cantidadTotal === 1 ? 'artículo' : 'artículos'} seleccionados`}
        confirmarTexto="Vaciar carrito"
        onCancelar={() => setConfirmandoLimpieza(false)}
        onConfirmar={confirmarLimpieza}
      />

      <ConfirmacionCarritoModal
        abierto={Boolean(itemAEliminar)}
        titulo={`¿Quitar ${itemAEliminar?.nombre_comercial || 'este producto'}?`}
        descripcion="El producto se eliminará de este carrito, pero seguirá disponible en el catálogo."
        detalle={itemAEliminar ? `Lote ${itemAEliminar.numero_lote} · ${itemAEliminar.cantidad} unidades` : ''}
        confirmarTexto="Quitar producto"
        onCancelar={() => setItemAEliminar(null)}
        onConfirmar={confirmarEliminacion}
      />
    </section>
  );
}
