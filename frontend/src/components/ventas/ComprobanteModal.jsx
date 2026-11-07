import React from 'react';
import { CheckCircle2, Printer, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { formatearQuetzales } from '../../utils/pos';

const etiquetasMetodo = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
};

const formatearFechaHora = (valor) => {
  if (!valor) return '';
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor));
};

export default function ComprobanteModal({ isOpen, venta, onClose }) {
  const detalles = venta?.detalles || [];

  return (
    <Modal
      isOpen={Boolean(isOpen && venta)}
      size="md"
      labelledBy="titulo-venta-registrada"
      describedBy="descripcion-venta-registrada"
      onClose={onClose}
      limitarAltura
      panelClassName="pos-receipt-dialog comprobante-imprimible"
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .comprobante-imprimible, .comprobante-imprimible * { visibility: visible; }
          .comprobante-imprimible {
            position: absolute;
            inset: 0;
            width: 100%;
            max-width: none !important;
            max-height: none !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          .no-imprimir { display: none !important; }
        }
      `}</style>

      <header className="pos-receipt-head no-imprimir">
        <div>
          <span aria-hidden="true"><CheckCircle2 /></span>
          <div>
            <h2 id="titulo-venta-registrada">Venta registrada</h2>
            <span id="descripcion-venta-registrada">El inventario y el carrito ya fueron actualizados.</span>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar comprobante">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="pos-receipt-body">
        <div className="pos-receipt-brand">
          <strong translate="no">FarmaCom</strong>
          <span>Farmacia San Gabriel</span>
          <p>{venta?.nombre_sucursal}</p>
        </div>

        <div className="pos-receipt-reference">
          <strong>Comprobante #{venta?.id_venta}</strong>
          <time dateTime={venta?.fecha_venta}>{formatearFechaHora(venta?.fecha_venta)}</time>
        </div>

        <dl className="pos-receipt-meta">
          <div><dt>Cliente</dt><dd>{venta?.nombre_cliente || 'Consumidor final'}</dd></div>
          <div><dt>Atendió</dt><dd>{venta?.nombre_usuario}</dd></div>
          <div><dt>Método</dt><dd>{etiquetasMetodo[venta?.metodo_pago] || venta?.metodo_pago}</dd></div>
        </dl>

        <div className="pos-receipt-products">
          <div><span>Producto</span><span>Importe</span></div>
          <ul>
            {detalles.map((item) => (
              <li key={item.id_detalle_venta}>
                <div>
                  <strong>{item.nombre_comercial}</strong>
                  <span>{item.cantidad} × {formatearQuetzales(item.precio_unitario)}</span>
                </div>
                <strong>{formatearQuetzales(item.subtotal)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <dl className="pos-receipt-totals">
          <div><dt>Monto recibido</dt><dd>{formatearQuetzales(venta?.monto_recibido)}</dd></div>
          <div><dt>Cambio</dt><dd>{formatearQuetzales(venta?.cambio)}</dd></div>
          <div className="is-total"><dt>Total</dt><dd>{formatearQuetzales(venta?.total)}</dd></div>
        </dl>

        <p className="pos-receipt-thanks">Gracias por su compra</p>
      </div>

      <footer className="pos-receipt-actions no-imprimir">
        <button type="button" onClick={onClose} className="pos-receipt-close">Cerrar</button>
        <button type="button" onClick={() => window.print()} className="pos-receipt-print">
          <Printer aria-hidden="true" />
          Imprimir comprobante
        </button>
      </footer>
    </Modal>
  );
}
