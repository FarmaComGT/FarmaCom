import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CarritosVentaBar from './CarritosVentaBar';

const carritos = [
  {
    id: 'carrito-1',
    nombre: 'Mostrador',
    items: [{ cantidad: 2 }],
    clienteSeleccionado: { nombre_cliente: 'Ana López' },
  },
  { id: 'carrito-2', nombre: 'Domicilio', items: [], clienteSeleccionado: null },
];

const renderizar = (props = {}) => {
  const handlers = {
    onCrear: vi.fn(),
    onCambiar: vi.fn(),
    onRenombrar: vi.fn(() => true),
    onCerrar: vi.fn(),
  };
  render(
    <CarritosVentaBar
      carritos={carritos}
      carritoActivoId="carrito-1"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe('CarritosVentaBar', () => {
  it('crea y permite cambiar entre carritos mostrando su resumen', async () => {
    const user = userEvent.setup();
    const handlers = renderizar();

    expect(screen.getByText(/2 artículos · Ana López/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nuevo carrito' }));
    await user.click(screen.getByRole('button', { name: 'Abrir Domicilio' }));

    expect(handlers.onCrear).toHaveBeenCalledTimes(1);
    expect(handlers.onCambiar).toHaveBeenCalledWith('carrito-2');
  });

  it('permite renombrar el carrito activo', async () => {
    const user = userEvent.setup();
    const handlers = renderizar();

    await user.click(screen.getByRole('button', { name: 'Renombrar Mostrador' }));
    const input = screen.getByLabelText('Nombre del carrito');
    await user.clear(input);
    await user.type(input, 'Venta pendiente');
    await user.click(screen.getByRole('button', { name: 'Guardar nombre del carrito' }));

    expect(handlers.onRenombrar).toHaveBeenCalledWith('carrito-1', 'Venta pendiente');
  });

  it('solicita confirmación antes de cerrar un carrito', async () => {
    const user = userEvent.setup();
    const handlers = renderizar();

    await user.click(screen.getByRole('button', { name: 'Cerrar Mostrador' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(handlers.onCerrar).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirmar cierre' }));
    expect(handlers.onCerrar).toHaveBeenCalledWith('carrito-1');
  });
});
