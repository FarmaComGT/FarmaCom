import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import ConfirmacionCarritoModal from './ConfirmacionCarritoModal';
import { useToast } from '../../context/ToastContext.jsx';

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
  const toast = useToast();
  const avisoNombre = useRef(null);
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [cerrandoId, setCerrandoId] = useState(null);
  const [errorNombre, setErrorNombre] = useState('');

  useEffect(() => {
    if (bloqueado) {
      setEditandoId(null);
      setCerrandoId(null);
      setErrorNombre('');
    }
  }, [bloqueado]);

  const iniciarEdicion = (carrito) => {
    setCerrandoId(null);
    setEditandoId(carrito.id);
    setNombreEditado(carrito.nombre);
    setErrorNombre('');
  };

  const guardarNombre = (evento) => {
    evento.preventDefault();
    const nombreLimpio = nombreEditado.trim();
    if (!nombreLimpio) {
      setErrorNombre('Escribe un nombre para identificar este carrito.');
      return;
    }
    setErrorNombre('');
    try {
      toast.cerrar(avisoNombre.current);
      if (onRenombrar(editandoId, nombreLimpio)) {
        setEditandoId(null);
      } else {
        avisoNombre.current = toast.error('No se pudo cambiar el nombre del carrito.');
      }
    } catch {
      avisoNombre.current = toast.error('No se pudo cambiar el nombre del carrito.');
    }
  };

  const confirmarCierre = () => {
    onCerrar(cerrandoId);
    setCerrandoId(null);
    setEditandoId(null);
  };

  const carritoCerrando = carritos.find((carrito) => carrito.id === cerrandoId);
  const cantidadCarritoCerrando = carritoCerrando ? cantidadArticulos(carritoCerrando) : 0;

  const manejarTecladoPestana = (evento, indiceActual) => {
    const teclas = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!teclas.includes(evento.key) || bloqueado) return;
    evento.preventDefault();
    let siguienteIndice = indiceActual;
    if (evento.key === 'Home') siguienteIndice = 0;
    if (evento.key === 'End') siguienteIndice = carritos.length - 1;
    if (evento.key === 'ArrowRight') siguienteIndice = (indiceActual + 1) % carritos.length;
    if (evento.key === 'ArrowLeft') siguienteIndice = (indiceActual - 1 + carritos.length) % carritos.length;
    const siguiente = carritos[siguienteIndice];
    onCambiar(siguiente.id);
    window.requestAnimationFrame(() => document.getElementById(`pestana-${siguiente.id}`)?.focus());
  };

  return (
    <>
      <section aria-label="Carritos de venta" className="pos-carts">
        <div className="pos-carts-head">
          <div>
            <span className="pos-section-kicker">Ventas simultáneas</span>
            <h2>Carritos de venta</h2>
            <p>{carritos.length} {carritos.length === 1 ? 'venta abierta' : 'ventas abiertas'}</p>
          </div>
          <button
            type="button"
            onClick={onCrear}
            disabled={bloqueado || Boolean(editandoId)}
            className="pos-cart-add"
          >
            <Plus aria-hidden="true" />
            Nuevo carrito
          </button>
        </div>

        <div className="pos-carts-row" role={editandoId ? undefined : 'tablist'} aria-label={editandoId ? undefined : 'Ventas en curso'}>
          {carritos.map((carrito, indice) => {
            const activo = carrito.id === carritoActivoId;
            const cantidad = cantidadArticulos(carrito);
            const editando = editandoId === carrito.id;

            if (editando) {
              return (
                <form key={carrito.id} onSubmit={guardarNombre} className="pos-cart-edit" aria-label={`Renombrar ${carrito.nombre}`}>
                  <label htmlFor={`nombre-${carrito.id}`}>Nombre del carrito</label>
                  <div>
                    <input
                      id={`nombre-${carrito.id}`}
                      name="nombre_carrito"
                      autoComplete="off"
                      autoFocus
                      value={nombreEditado}
                      onChange={(evento) => {
                        setNombreEditado(evento.target.value);
                        if (errorNombre) setErrorNombre('');
                      }}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Escape') {
                          setEditandoId(null);
                          setErrorNombre('');
                        }
                      }}
                      maxLength={40}
                      aria-invalid={Boolean(errorNombre)}
                      aria-describedby={errorNombre ? 'error-nombre-carrito' : undefined}
                    />
                    <button type="submit" aria-label="Guardar nombre del carrito">
                      <Check aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditandoId(null);
                        setErrorNombre('');
                      }}
                      aria-label="Cancelar cambio de nombre"
                    >
                      <X aria-hidden="true" />
                    </button>
                  </div>
                  {errorNombre && <p id="error-nombre-carrito" role="alert">{errorNombre}</p>}
                </form>
              );
            }

            return (
              <div key={carrito.id} className={`pos-cart ${activo ? 'pos-cart--active' : ''}`}>
                <button
                  id={`pestana-${carrito.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  aria-controls={`panel-${carrito.id}`}
                  tabIndex={activo ? 0 : -1}
                  onClick={() => onCambiar(carrito.id)}
                  onKeyDown={(evento) => manejarTecladoPestana(evento, indice)}
                  disabled={bloqueado || Boolean(editandoId)}
                  aria-label={`Abrir ${carrito.nombre}`}
                  className="pos-cart-tab"
                >
                  <span className="pos-cart-tab-name">{carrito.nombre}</span>
                  <span className="pos-cart-tab-meta">
                    {cantidad} {cantidad === 1 ? 'artículo' : 'artículos'}
                    {carrito.clienteSeleccionado
                      ? ` · ${carrito.clienteSeleccionado.nombre_cliente}`
                      : ' · Consumidor final'}
                  </span>
                </button>

                {activo && (
                  <div className="pos-cart-actions" aria-label={`Acciones de ${carrito.nombre}`}>
                    <button type="button" onClick={() => iniciarEdicion(carrito)} disabled={bloqueado} aria-label={`Renombrar ${carrito.nombre}`} title="Renombrar carrito…">
                      <Pencil aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => setCerrandoId(carrito.id)} disabled={bloqueado} aria-label={`Cerrar ${carrito.nombre}`} title="Cerrar carrito…">
                      <X aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <ConfirmacionCarritoModal
        abierto={Boolean(carritoCerrando)}
        titulo={`¿Cerrar ${carritoCerrando?.nombre || 'este carrito'}?`}
        descripcion="Se eliminarán los productos y el cliente guardados en esta venta. Esta acción no se puede deshacer."
        detalle={`${cantidadCarritoCerrando} ${cantidadCarritoCerrando === 1 ? 'artículo' : 'artículos'} en el carrito`}
        confirmarTexto="Cerrar carrito"
        onCancelar={() => setCerrandoId(null)}
        onConfirmar={confirmarCierre}
      />
    </>
  );
}
