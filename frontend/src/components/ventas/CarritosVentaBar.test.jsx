import React from 'react';
import { render as renderBase, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CarritosVentaBar from './CarritosVentaBar';
import { ToastProvider } from '../../context/ToastContext.jsx';

const render = (ui, options) => renderBase(ui, { wrapper: ToastProvider, ...options });

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
    expect(screen.getByRole('tab', { name: 'Abrir Mostrador' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Abrir Domicilio' }));

    expect(handlers.onCrear).toHaveBeenCalledTimes(1);
    expect(handlers.onCambiar).toHaveBeenCalledWith('carrito-2');
  });

  it('permite recorrer las ventas abiertas con el teclado', async () => {
    const user = userEvent.setup();
    const handlers = renderizar();
    const mostrador = screen.getByRole('tab', { name: 'Abrir Mostrador' });

    mostrador.focus();
    await user.keyboard('{ArrowRight}');

    expect(handlers.onCambiar).toHaveBeenCalledWith('carrito-2');
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Abrir Domicilio' })).toHaveFocus());
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
    expect(screen.getByRole('dialog', { name: '¿Cerrar Mostrador?' })).toBeInTheDocument();
    expect(screen.getByText('2 artículos en el carrito')).toBeInTheDocument();
    expect(handlers.onCerrar).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cerrar carrito' }));
    expect(handlers.onCerrar).toHaveBeenCalledWith('carrito-1');
  });

  it('muestra el error junto al nombre y conserva la edición si está vacío', async () => {
    const user = userEvent.setup();
    const handlers = renderizar();

    await user.click(screen.getByRole('button', { name: 'Renombrar Mostrador' }));
    const input = screen.getByRole('textbox', { name: 'Nombre del carrito' });
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Guardar nombre del carrito' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un nombre');
    expect(handlers.onRenombrar).not.toHaveBeenCalled();
  });

  it('permite cancelar el cierre sin perder el carrito', async () => {
    const user = userEvent.setup();
    const handlers = renderizar();

    await user.click(screen.getByRole('button', { name: 'Cerrar Mostrador' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(handlers.onCerrar).not.toHaveBeenCalled();
  });

  it.each(['rechazo', 'excepción'])('notifica el %s al renombrar y permite reintentar sin perder el nombre', async (caso) => {
    const user = userEvent.setup();
    const onRenombrar = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    if (caso === 'excepción') onRenombrar.mockReset().mockImplementationOnce(() => { throw new Error('Fallo local'); }).mockReturnValueOnce(true);
    renderizar({ onRenombrar });
    await user.click(screen.getByRole('button', { name: 'Renombrar Mostrador' }));
    const input = screen.getByRole('textbox', { name: 'Nombre del carrito' });
    await user.clear(input);
    await user.type(input, '  María Pérez  ');
    await user.click(screen.getByRole('button', { name: 'Guardar nombre del carrito' }));

    const aviso = screen.getByRole('status');
    expect(aviso).toHaveTextContent('No se pudo cambiar el nombre del carrito.');
    expect(aviso.closest('form')).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveValue('  María Pérez  ');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(onRenombrar).toHaveBeenLastCalledWith('carrito-1', 'María Pérez');

    await user.click(screen.getByRole('button', { name: 'Guardar nombre del carrito' }));
    expect(onRenombrar).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Nombre del carrito' })).not.toBeInTheDocument();
  });
});
