import React, { useEffect, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatearQuetzales } from '../../utils/pos';

const formatearVencimiento = (fecha) => {
  if (!fecha) return 'sin vencimiento';
  return `vence ${new Intl.DateTimeFormat('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(fecha))}`;
};

export default function CarritoVentaItem({
  item,
  onIncrementar,
  onDisminuir,
  onActualizarCantidad,
  onEliminar,
}) {
  const [cantidadTexto, setCantidadTexto] = useState(String(item.cantidad));

  useEffect(() => {
    setCantidadTexto(String(item.cantidad));
  }, [item.cantidad]);

  const confirmarCantidad = () => {
    if (cantidadTexto.trim() === '') {
      setCantidadTexto(String(item.cantidad));
      return;
    }

    onActualizarCantidad(item, cantidadTexto);
  };

  const cantidadNumerica = Number(cantidadTexto);
  const excedeStock = cantidadTexto.trim() !== ''
    && Number.isFinite(cantidadNumerica)
    && cantidadNumerica > item.stock_disponible;
  const faltantesPromocion = item.promocionDisponible
    ? Math.max(0, Number(item.promocion.cantidad_minima) - item.cantidad)
    : 0;
  const precioAplicado = item.precioAplicado ?? item.precioUnitario;

  return (
    <li className="pos-item">
      <div className="pos-item-info">
        <span className="pos-item-name">
          {item.nombre_comercial}
        </span>
        <span className="pos-item-meta">
          {item.presentacion} · Lote {item.numero_lote} ·{' '}
          {formatearVencimiento(item.fecha_vencimiento)}
        </span>
        {item.promocionDisponible && (
          <p className={`pos-item-promo ${item.promocionAplicada ? 'pos-item-promo--aplicada' : 'pos-item-promo--pendiente'}`}>
            {item.promocionAplicada
              ? `Promoción aplicada: ${formatearQuetzales(item.promocion.precio_promocion)} por unidad`
              : `Agrega ${faltantesPromocion} ${faltantesPromocion === 1 ? 'unidad' : 'unidades'} más para aplicar la promoción`}
          </p>
        )}
      </div>

      <div className="pos-stepper-wrap">
        <div className={`pos-stepper ${excedeStock ? 'pos-stepper--invalid' : ''}`}>
          <button
            type="button"
            onClick={() => onDisminuir(item)}
            aria-label={`Disminuir ${item.nombre_comercial}`}
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <input
            type="text"
            name={`cantidad_${item.id_lote || item.clave}`}
            autoComplete="off"
            inputMode="numeric"
            pattern="[0-9]*"
            value={cantidadTexto}
            onChange={(evento) => {
              if (/^\d*$/.test(evento.target.value)) {
                setCantidadTexto(evento.target.value);
              }
            }}
            onBlur={confirmarCantidad}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') evento.currentTarget.blur();
            }}
            onFocus={(evento) => evento.currentTarget.select()}
            aria-label={`Cantidad de ${item.nombre_comercial}`}
            aria-invalid={excedeStock}
            aria-describedby={excedeStock ? `error-cantidad-${item.clave}` : undefined}
          />
          <button
            type="button"
            onClick={() => onIncrementar(item)}
            aria-label={`Aumentar ${item.nombre_comercial}`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        {excedeStock && (
          <p id={`error-cantidad-${item.clave}`} role="alert" className="pos-qty-alert">
            Máx. {item.stock_disponible}
          </p>
        )}
      </div>

      <div className="pos-item-amount">
        {item.promocionAplicada && (
          <p className="was">
            {formatearQuetzales(item.precioUnitario)}
          </p>
        )}
        <p className={item.promocionAplicada ? 'unit unit--promo' : 'unit'}>
          {formatearQuetzales(precioAplicado)}
        </p>
        <p className="subtotal">
          {formatearQuetzales(precioAplicado * item.cantidad)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onEliminar(item)}
        aria-label={`Eliminar ${item.nombre_comercial}`}
        className="pos-item-remove"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
