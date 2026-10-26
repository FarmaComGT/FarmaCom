import React, { useEffect, useState } from 'react';
import {
  Check,
  Pencil,
  Plus,
  ShoppingCart,
  X,
} from 'lucide-react';

const cantidadArticulos = (carrito) => carrito.items.reduce(
  (total, item) => total + Number(item.cantidad || 0),
  0,
);

export default function CarritosVentaBar({
  carritos,
  carritoActivoId,
  bloqueado = false,
  onCrear,
  onCambiar,
  onRenombrar,
  onCerrar,
}) {
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [cerrandoId, setCerrandoId] = useState(null);

  useEffect(() => {
    if (bloqueado) {
      setEditandoId(null);
      setCerrandoId(null);
    }
  }, [bloqueado]);

  const iniciarEdicion = (carrito) => {
    setCerrandoId(null);
    setEditandoId(carrito.id);
    setNombreEditado(carrito.nombre);
  };

  const guardarNombre = (evento) => {
    evento.preventDefault();
    if (onRenombrar(editandoId, nombreEditado)) {
      setEditandoId(null);
    }
  };

  const confirmarCierre = () => {
    onCerrar(cerrandoId);
    setCerrandoId(null);
    setEditandoId(null);
  };

  return (
    <section
      aria-label="Carritos de venta"
      className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <div className="flex items-center gap-2 text-primary">
          <ShoppingCart className="h-5 w-5" />
          <h2 className="font-headline text-sm font-extrabold">Carritos de venta</h2>
        </div>
        <button
          type="button"
          onClick={onCrear}
          disabled={bloqueado}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo carrito
        </button>
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {carritos.map((carrito) => {
          const activo = carrito.id === carritoActivoId;
          const cantidad = cantidadArticulos(carrito);
          const editando = editandoId === carrito.id;

          return (
            <div
              key={carrito.id}
              className={`flex min-w-fit items-center rounded-xl border transition-colors ${
                activo
                  ? 'border-primary/20 bg-primary/8 text-primary'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {editando ? (
                <form onSubmit={guardarNombre} className="flex items-center gap-1 p-1.5">
                  <input
                    autoFocus
                    value={nombreEditado}
                    onChange={(evento) => setNombreEditado(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Escape') setEditandoId(null);
                    }}
                    maxLength={40}
                    aria-label="Nombre del carrito"
                    className="w-36 rounded-lg border border-primary/20 bg-white px-2 py-1.5 text-xs font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="submit"
                    aria-label="Guardar nombre del carrito"
                    className="rounded-lg p-1.5 text-primary hover:bg-white"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoId(null)}
                    aria-label="Cancelar cambio de nombre"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onCambiar(carrito.id)}
                    disabled={bloqueado}
                    aria-label={`Abrir ${carrito.nombre}`}
                    className="px-3 py-2 text-left disabled:opacity-50"
                  >
                    <span className="block max-w-40 truncate text-xs font-extrabold">
                      {carrito.nombre}
                    </span>
                    <span className="block text-[10px] font-semibold opacity-70">
                      {cantidad} {cantidad === 1 ? 'artículo' : 'artículos'}
                      {carrito.clienteSeleccionado
                        ? ` · ${carrito.clienteSeleccionado.nombre_cliente}`
                        : ''}
                    </span>
                  </button>

                  {activo && (
                    <div className="flex items-center border-l border-primary/10 pr-1">
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(carrito)}
                        disabled={bloqueado}
                        aria-label={`Renombrar ${carrito.nombre}`}
                        className="rounded-lg p-1.5 text-primary/70 hover:bg-white disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoId(null);
                          setCerrandoId(carrito.id);
                        }}
                        disabled={bloqueado}
                        aria-label={`Cerrar ${carrito.nombre}`}
                        className="rounded-lg p-1.5 text-error hover:bg-error-container/50 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {cerrandoId && (
        <div
          role="alert"
          className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="font-semibold">
            Se eliminarán los productos y el cliente guardados en este carrito.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setCerrandoId(null)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarCierre}
              className="rounded-lg bg-error px-3 py-1.5 text-xs font-bold text-white"
            >
              Confirmar cierre
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
