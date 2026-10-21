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
    <section className="clinical-glass flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 shadow-2xl shadow-primary/5">
      <header className="flex items-end justify-between gap-4 border-b border-slate-200/70 p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary">
              Caja / salida
            </h2>
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {cantidadTotal} {cantidadTotal === 1 ? 'artículo' : 'artículos'}
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={manejarLimpieza}
            onBlur={() => setConfirmandoLimpieza(false)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              confirmandoLimpieza
                ? 'bg-error text-white'
                : 'text-error hover:bg-error-container/40'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmandoLimpieza ? 'Confirmar' : 'Limpiar'}
          </button>
        )}
      </header>

      <ClienteVentaSection clientes={clientes} cargando={cargandoClientes} seleccionado={clienteSeleccionado} onSeleccionar={onClienteChange} onNuevo={onNuevoCliente} />

      <div className="hidden grid-cols-12 gap-3 bg-surface-container-low/60 px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 sm:grid">
        <span className="col-span-5">Producto</span>
        <span className="col-span-3 text-center">Cantidad</span>
        <span className="col-span-3 text-right">Importe</span>
        <span className="col-span-1" />
      </div>

      <div className="min-h-64 flex-1 overflow-y-auto px-5 sm:px-6">
        {items.length === 0 ? (
          <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
            <span className="mb-4 rounded-full bg-primary/8 p-4 text-primary">
              <ReceiptText className="h-8 w-8" />
            </span>
            <p className="font-headline font-extrabold text-slate-700">
              El carrito está vacío
            </p>
            <p className="mt-1 max-w-xs text-sm text-slate-400">
              Busca y selecciona un producto para iniciar la venta.
            </p>
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
      {/*
      <footer className="space-y-5 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 px-1">
          <span className="font-headline text-lg font-extrabold text-secondary">
            Monto total
          </span>
          <div className="text-right">
            <p className="font-mono text-3xl font-black tracking-tight text-primary">
              {formatearQuetzales(total)}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Total de la venta
            </p>
          </div>
        </div>

        <MetodoPagoSelector
          seleccionado={metodoPago}
          onSeleccionar={onMetodoPagoChange}
        />

        <button
          type="button"
          onClick={onProcesar}
          disabled={items.length === 0}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-primary-container py-4 font-headline text-base font-extrabold text-white shadow-xl shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <ShoppingCart className="h-5 w-5" />
          Procesar venta
        </button>
      </footer> */}
    </section>
  );
}
