import React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Layers3,
  PackageCheck,
  X,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { formatearQuetzales } from '../../utils/pos';

const formatearNumero = (valor) => new Intl.NumberFormat('es-GT').format(Number(valor) || 0);

const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin fecha de vencimiento';
  return `Vence ${new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(fecha))}`;
};

export default function SeleccionLoteModal({ producto, onClose, onSeleccionar }) {
  const lotes = producto?.lotes || [];
  const existencias = lotes.reduce((total, lote) => total + Number(lote.stock_disponible || 0), 0);

  return (
    <Modal
      isOpen={Boolean(producto)}
      size="lg"
      labelledBy="titulo-seleccion-lote"
      describedBy="descripcion-seleccion-lote"
      onClose={onClose}
      limitarAltura
      panelClassName="pos-lot-dialog"
    >
      <header className="pos-lot-header">
        <div className="pos-lot-title-wrap">
          <span className="pos-lot-title-icon" aria-hidden="true"><Layers3 /></span>
          <div className="pos-lot-title-copy">
            <h2 id="titulo-seleccion-lote">Seleccionar lote</h2>
            <p>{producto?.nombre_comercial || 'Producto'}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="pos-lot-close" aria-label="Cerrar selección de lote">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="pos-lot-summary" id="descripcion-seleccion-lote">
        <p>Elige el lote que deseas agregar al carrito.</p>
        <span>{lotes.length} {lotes.length === 1 ? 'lote' : 'lotes'} · {formatearNumero(existencias)} unidades disponibles</span>
      </div>

      <div className="pos-lot-list" aria-label="Lotes disponibles">
        {lotes.length === 0 ? (
          <div className="pos-lot-empty">
            <PackageCheck aria-hidden="true" />
            <strong>No hay lotes disponibles</strong>
            <p>Cierra esta ventana e intenta con otro producto.</p>
          </div>
        ) : lotes.map((lote) => {
            const proximoAVencer = lote.estado_vencimiento === 'proximo_a_vencer';
            const promocion = Number(producto?.promocion?.precio_promocion)
              < Number(lote.precio_venta)
              ? producto.promocion
              : null;

            return (
              <button
                key={lote.id_lote}
                type="button"
                onClick={() => onSeleccionar(lote)}
                disabled={!lote.tiene_precio}
                aria-label={`Seleccionar lote ${lote.numero_lote}`}
                aria-describedby={`detalle-lote-${lote.id_lote}`}
                className="pos-lot-option"
              >
                <div className="pos-lot-option-main" id={`detalle-lote-${lote.id_lote}`}>
                  <div className="pos-lot-option-name">
                    <PackageCheck aria-hidden="true" />
                    <div>
                      <strong>Lote {lote.numero_lote}</strong>
                      <span className={proximoAVencer ? 'pos-lot-expiry pos-lot-expiry--warning' : 'pos-lot-expiry'}>
                        {proximoAVencer ? <AlertTriangle aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}
                        {proximoAVencer && 'Próximo a vencer · '}{formatearFecha(lote.fecha_vencimiento)}
                      </span>
                    </div>
                  </div>

                  <div className="pos-lot-option-data">
                    <span><small>Existencias</small><strong>{formatearNumero(lote.stock_disponible)} unidades</strong></span>
                    <span><small>Precio unitario</small><strong>{lote.tiene_precio ? formatearQuetzales(lote.precio_venta) : 'Sin precio'}</strong></span>
                  </div>
                </div>

                {promocion && (
                  <p className="pos-lot-promo">
                    Promoción desde {promocion.cantidad_minima} unidades:{' '}
                    {formatearQuetzales(promocion.precio_promocion)} por unidad
                  </p>
                )}
                {!lote.tiene_precio && <p className="pos-lot-unavailable">Este lote no puede venderse hasta registrar un precio.</p>}
                <ChevronRight className="pos-lot-chevron" aria-hidden="true" />
              </button>
            );
          })}
      </div>

      <footer className="pos-lot-footer">
        <button
          type="button"
          onClick={onClose}
          className="pos-lot-cancel"
        >
          Cancelar
        </button>
      </footer>
    </Modal>
  );
}
