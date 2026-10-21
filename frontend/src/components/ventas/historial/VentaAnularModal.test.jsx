import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import VentaAnularModal from './VentaAnularModal';

const ventaEfectivo = {
  id_venta: 21,
  metodo_pago: 'efectivo',
  total: 125.5,
};

describe('VentaAnularModal', () => {
  it('exige un motivo y envía su valor normalizado al confirmar', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <VentaAnularModal
        isOpen
        venta={ventaEfectivo}
        anulando={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/No se permiten devoluciones parciales/i)).toBeInTheDocument();
    const boton = screen.getByRole('button', { name: 'Sí, anular venta' });
    expect(boton).toBeDisabled();

    await user.type(screen.getByLabelText(/Motivo de anulación/), '  Error de cobro  ');
    expect(boton).toBeEnabled();
    await user.click(boton);

    expect(onConfirm).toHaveBeenCalledWith('Error de cobro');
  });

  it('presenta el error del backend sin cerrar la confirmación', () => {
    render(
      <VentaAnularModal
        isOpen
        venta={ventaEfectivo}
        anulando={false}
        error="La sesión de caja está cerrada"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('La sesión de caja está cerrada');
  });

  it('advierte sobre Recurrente y no ofrece anulación para ventas con tarjeta', () => {
    const onConfirm = vi.fn();

    render(
      <VentaAnularModal
        isOpen
        venta={{ ...ventaEfectivo, metodo_pago: 'tarjeta' }}
        anulando={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/reembolso en Recurrente/i);
    expect(screen.queryByLabelText(/Motivo de anulación/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sí, anular venta' })).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
