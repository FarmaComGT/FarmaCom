import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { formatearQuetzales } from '../../utils/pos';
import MetodoPagoSelector from './MetodoPagoSelector';

export default function CarritoAccionesCobro({ total, metodoPago, deshabilitado, onMetodoPagoChange, onProcesar }) {
  return (
    <footer className="pos-checkout">
      <div className="pos-checkout-total">
        <span>Monto total</span>
        <strong>{formatearQuetzales(total)}</strong>
      </div>

      <MetodoPagoSelector
        seleccionado={metodoPago}
        onSeleccionar={onMetodoPagoChange}
      />

      <button
        type="button"
        onClick={onProcesar}
        disabled={deshabilitado}
        className="pos-submit"
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        Procesar venta
      </button>
    </footer>
  );
}
