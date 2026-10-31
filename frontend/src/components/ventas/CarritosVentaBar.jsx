import React, { useEffect, useState } from 'react';
import {
  Check,
  Pencil,
  Plus,
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
    <section aria-label="Carritos de venta" className="pos-carts">
      <div className="pos-carts-row">
        {carritos.map((carrito) => {
          const activo = carrito.id === carritoActivoId;
          const cantidad = cantidadArticulos(carrito);
          const editando = editandoId === carrito.id;

          if (editando) {
            return (
              <form key={carrito.id} onSubmit={guardarNombre} className="pos-cart-edit">
                <input
                  autoFocus
                  value={nombreEditado}
                  onChange={(evento) => setNombreEditado(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Escape') setEditandoId(null);
                  }}
                  maxLength={40}
                  aria-label="Nombre del carrito"
                />
                <button type="submit" aria-label="Guardar nombre del carrito">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoId(null)}
                  aria-label="Cancelar cambio de nombre"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </form>
            );
          }

          return (
            <div key={carrito.id} className={`pos-cart ${activo ? 'pos-cart--active' : ''}`}>
              <button
                type="button"
                onClick={() => onCambiar(carrito.id)}
                disabled={bloqueado}
                aria-label={`Abrir ${carrito.nombre}`}
                className="pos-cart-tab"
              >
                <span className="pos-cart-tab-name">{carrito.nombre}</span>
                <span className="pos-cart-tab-meta">
                  {cantidad} {cantidad === 1 ? 'artículo' : 'artículos'}
                  {carrito.clienteSeleccionado
                    ? ` · ${carrito.clienteSeleccionado.nombre_cliente}`
                    : ''}
                </span>
              </button>

              {activo && (
                <div className="pos-cart-actions">
                  <button
                    type="button"
                    onClick={() => iniciarEdicion(carrito)}
                    disabled={bloqueado}
                    aria-label={`Renombrar ${carrito.nombre}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoId(null);
                      setCerrandoId(carrito.id);
                    }}
                    disabled={bloqueado}
                    aria-label={`Cerrar ${carrito.nombre}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onCrear}
          disabled={bloqueado}
          className="pos-cart-add"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Nuevo carrito
        </button>
      </div>

      {cerrandoId && (
        <div role="alert" className="pos-cart-confirm">
          <p>Se eliminarán los productos y el cliente guardados en este carrito.</p>
          <div className="pos-cart-confirm-actions">
            <button
              type="button"
              onClick={() => setCerrandoId(null)}
              className="pos-cart-confirm-cancel"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarCierre}
              className="pos-cart-confirm-ok"
            >
              Confirmar cierre
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
