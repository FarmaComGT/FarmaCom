import React, { useEffect, useState } from 'react';
import { ReceiptText, ShoppingCart, Trash2 } from 'lucide-react';
import CarritoVentaItem from './CarritoVentaItem';
import ClienteVentaSection from './ClienteVentaSection';
import CarritoAccionesCobro from './CarritoAccionesCobro';

export default function CarritoVenta({
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

  useEffect(() => {
    if (items.length === 0) setConfirmandoLimpieza(false);
  }, [items.length]);

  const manejarLimpieza = () => {
    if (!confirmandoLimpieza) {
      setConfirmandoLimpieza(true);
      return;
    }

    onLimpiar();
    setConfirmandoLimpieza(false);
  };

  return (
    <section className="pos-panel">
      <header className="pos-cart-panel-head">
        <div>
          <h2>
            <ShoppingCart aria-hidden="true" />
            Caja / salida
          </h2>
          <p>
            {cantidadTotal} {cantidadTotal === 1 ? 'artículo' : 'artículos'}
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={manejarLimpieza}
            onBlur={() => setConfirmandoLimpieza(false)}
            className={`pos-clear-btn ${confirmandoLimpieza ? 'pos-clear-btn--confirm' : ''}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {confirmandoLimpieza ? 'Confirmar' : 'Limpiar'}
          </button>
        )}
      </header>

      <ClienteVentaSection clientes={clientes} cargando={cargandoClientes} seleccionado={clienteSeleccionado} onSeleccionar={onClienteChange} onNuevo={onNuevoCliente} />

      <div className="pos-cart-columns">
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
          items.map((item) => (
            <CarritoVentaItem
              key={item.clave}
              item={item}
              onIncrementar={onIncrementar}
              onDisminuir={onDisminuir}
              onActualizarCantidad={onActualizarCantidad}
              onEliminar={onEliminar}
            />
          ))
        )}
      </div>

      <CarritoAccionesCobro total={total} metodoPago={metodoPago} deshabilitado={items.length === 0} onMetodoPagoChange={onMetodoPagoChange} onProcesar={onProcesar} />
    </section>
  );
}
