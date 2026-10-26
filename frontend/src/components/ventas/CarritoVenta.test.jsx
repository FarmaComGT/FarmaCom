import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CarritoVenta from './CarritoVenta.jsx';

const item = (cambios = {}) => ({
  clave: 'lote-1',
  id_lote: 1,
  nombre_comercial: 'Paracetamol',
  presentacion: 'Tableta',
  numero_lote: 'L-001',
  fecha_vencimiento: '2099-01-01',
  cantidad: 2,
  stock_disponible: 10,
  precioUnitario: 5,
  ...cambios,
});

const callbacks = {
  onMetodoPagoChange: vi.fn(),
  onClienteChange: vi.fn(),
  onNuevoCliente: vi.fn(),
  onIncrementar: vi.fn(),
  onDisminuir: vi.fn(),
  onActualizarCantidad: vi.fn(),
  onEliminar: vi.fn(),
  onLimpiar: vi.fn(),
  onProcesar: vi.fn(),
};

const renderizar = (props = {}) => render(
  <CarritoVenta
    items={[]}
    total={0}
    cantidadTotal={0}
    metodoPago="efectivo"
    clientes={[]}
    cargandoClientes={false}
    clienteSeleccionado={null}
    {...callbacks}
    {...props}
  />,
);

describe('CarritoVenta', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra el carrito vacío y no permite procesar la venta', () => {
    renderizar();

    expect(screen.getByText('El carrito está vacío')).toBeInTheDocument();
    expect(screen.getByText('0 artículos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Procesar venta' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Limpiar/ })).not.toBeInTheDocument();
  });

  it('lista los productos del carrito con su cantidad total', () => {
    renderizar({
      items: [item(), item({ clave: 'lote-2', id_lote: 2, nombre_comercial: 'Amoxil', cantidad: 1 })],
      cantidadTotal: 3,
      total: 15,
    });

    expect(screen.getByText('3 artículos')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('Amoxil')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Procesar venta' })).toBeEnabled();
  });

  it('usa el singular cuando hay un solo artículo', () => {
    renderizar({ items: [item({ cantidad: 1 })], cantidadTotal: 1, total: 5 });

    expect(screen.getByText('1 artículo')).toBeInTheDocument();
  });

  it('pide confirmación antes de vaciar el carrito', async () => {
    const user = userEvent.setup();
    renderizar({ items: [item()], cantidadTotal: 2, total: 10 });

    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(callbacks.onLimpiar).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(callbacks.onLimpiar).toHaveBeenCalledTimes(1);
  });

  it('cancela la confirmación de limpieza al salir del botón', async () => {
    const user = userEvent.setup();
    renderizar({ items: [item()], cantidadTotal: 2, total: 10 });

    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    await user.tab();

    expect(screen.getByRole('button', { name: 'Limpiar' })).toBeInTheDocument();
    expect(callbacks.onLimpiar).not.toHaveBeenCalled();
  });

  it('reinicia la confirmación cuando el carrito queda vacío', async () => {
    const user = userEvent.setup();
    const { rerender } = renderizar({ items: [item()], cantidadTotal: 2, total: 10 });
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));

    rerender(<CarritoVenta items={[]} total={0} cantidadTotal={0} metodoPago="efectivo" clientes={[]} {...callbacks} />);
    rerender(<CarritoVenta items={[item()]} total={10} cantidadTotal={2} metodoPago="efectivo" clientes={[]} {...callbacks} />);

    expect(screen.getByRole('button', { name: 'Limpiar' })).toBeInTheDocument();
  });

  it('envía las acciones de cada producto y procesa la venta', async () => {
    const user = userEvent.setup();
    const producto = item();
    renderizar({ items: [producto], cantidadTotal: 2, total: 10 });

    await user.click(screen.getByRole('button', { name: 'Aumentar Paracetamol' }));
    await user.click(screen.getByRole('button', { name: 'Disminuir Paracetamol' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar Paracetamol' }));
    await user.click(screen.getByRole('button', { name: 'Procesar venta' }));

    expect(callbacks.onIncrementar).toHaveBeenCalledWith(producto);
    expect(callbacks.onDisminuir).toHaveBeenCalledWith(producto);
    expect(callbacks.onEliminar).toHaveBeenCalledWith(producto);
    expect(callbacks.onProcesar).toHaveBeenCalledTimes(1);
  });

  it('confirma una cantidad escrita con Enter y restaura una cantidad vacía', async () => {
    const user = userEvent.setup();
    const producto = item();
    renderizar({ items: [producto], cantidadTotal: 2, total: 10 });
    const campo = screen.getByRole('textbox', { name: 'Cantidad de Paracetamol' });

    await user.clear(campo);
    await user.type(campo, '4{Enter}');
    expect(callbacks.onActualizarCantidad).toHaveBeenCalledWith(producto, '4');

    await user.clear(campo);
    await user.tab();
    expect(campo).toHaveValue('2');
    expect(callbacks.onActualizarCantidad).toHaveBeenCalledTimes(1);
  });

  it('ignora caracteres que no son dígitos en la cantidad', async () => {
    const user = userEvent.setup();
    renderizar({ items: [item()], cantidadTotal: 2, total: 10 });
    const campo = screen.getByRole('textbox', { name: 'Cantidad de Paracetamol' });

    await user.type(campo, 'a-');

    expect(campo).toHaveValue('2');
  });

  it('abre el registro de un cliente nuevo', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Agregar cliente' }));

    expect(callbacks.onNuevoCliente).toHaveBeenCalledTimes(1);
  });
});
