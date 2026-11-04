import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ComprobanteModal from './ComprobanteModal.jsx';

const venta = {
  id_venta: 15,
  nombre_sucursal: 'Sucursal Central',
  fecha_venta: '2026-11-03T18:30:00.000Z',
  nombre_cliente: null,
  nombre_usuario: 'Ana Pérez',
  metodo_pago: 'efectivo',
  monto_recibido: 20,
  cambio: 3,
  total: 17,
  detalles: [{
    id_detalle_venta: 1,
    nombre_comercial: 'Paracetamol',
    cantidad: 2,
    precio_unitario: 8.5,
    subtotal: 17,
  }],
};

describe('ComprobanteModal', () => {
  beforeEach(() => {
    window.print = vi.fn();
  });

  it('presenta el comprobante como diálogo accesible y localiza sus datos', () => {
    render(<ComprobanteModal isOpen venta={venta} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Venta registrada' })).toBeInTheDocument();
    expect(screen.getByText('Comprobante #15')).toBeInTheDocument();
    expect(screen.getByText('Consumidor final')).toBeInTheDocument();
    expect(screen.getAllByText('Q 17.00')).toHaveLength(2);
  });

  it('permite imprimir y cerrar el comprobante', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ComprobanteModal isOpen venta={venta} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Imprimir comprobante' }));
    expect(window.print).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Cerrar comprobante' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
