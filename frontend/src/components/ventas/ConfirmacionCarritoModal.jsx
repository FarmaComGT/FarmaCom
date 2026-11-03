import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Modal } from '../ui/Modal';

export default function ConfirmacionCarritoModal({
  abierto,
  titulo,
  descripcion,
  detalle,
  confirmarTexto,
  onCancelar,
  onConfirmar,
}) {
  return (
    <Modal
      isOpen={abierto}
      size="sm"
      labelledBy="titulo-confirmacion-carrito"
      describedBy="descripcion-confirmacion-carrito"
      onClose={onCancelar}
      panelClassName="pos-cart-dialog"
    >
      <header className="pos-cart-dialog-head">
        <span aria-hidden="true"><AlertTriangle /></span>
        <div>
          <p>Confirmación requerida</p>
          <h2 id="titulo-confirmacion-carrito">{titulo}</h2>
        </div>
        <button type="button" onClick={onCancelar} aria-label="Cerrar confirmación">
          <X aria-hidden="true" />
        </button>
      </header>
      <div className="pos-cart-dialog-body" id="descripcion-confirmacion-carrito">
        <p>{descripcion}</p>
        {detalle && <strong>{detalle}</strong>}
      </div>
      <footer className="pos-cart-dialog-actions">
        <button type="button" onClick={onCancelar} className="pos-cart-dialog-cancel">Cancelar</button>
        <button type="button" onClick={onConfirmar} className="pos-cart-dialog-danger">{confirmarTexto}</button>
      </footer>
    </Modal>
  );
}
