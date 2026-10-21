import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CarritoAccionesCobro from './CarritoAccionesCobro.jsx';

describe('CarritoAccionesCobro', () => {
  it('muestra el total y expone las acciones de pago', async () => {
    const onProcesar = vi.fn(); const onMetodoPagoChange = vi.fn();
    render(<CarritoAccionesCobro total={25} metodoPago="efectivo" deshabilitado={false} onMetodoPagoChange={onMetodoPagoChange} onProcesar={onProcesar} />);
    expect(screen.getByText('Q 25.00')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tarjeta' }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Procesar venta' }));
    expect(onMetodoPagoChange).toHaveBeenCalledWith('tarjeta');
    expect(onProcesar).toHaveBeenCalledOnce();
  });
});
