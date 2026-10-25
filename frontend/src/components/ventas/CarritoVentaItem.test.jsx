import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CarritoVentaItem from './CarritoVentaItem';

const item = {
  clave: 'producto-1',
  nombre_comercial: 'Paracetamol',
  presentacion: 'Tableta',
  numero_lote: 'L-001',
  cantidad: 2,
  stock_disponible: 5,
  precioUnitario: 8.5,
  cantidad_lotes: 2,
};

const propsBase = {
  item,
  onIncrementar: vi.fn(),
  onDisminuir: vi.fn(),
  onActualizarCantidad: vi.fn(),
  onEliminar: vi.fn(),
};

describe('CarritoVentaItem', () => {
  it('identifica el lote seleccionado para el artículo', () => {
    render(<CarritoVentaItem {...propsBase} />);

    expect(screen.getByText(/Lote L-001/)).toBeInTheDocument();
  });

  it('avisa en tiempo real, mientras se escribe, si la cantidad excede el stock disponible', async () => {
    const user = userEvent.setup();
    render(<CarritoVentaItem {...propsBase} />);

    const input = screen.getByLabelText('Cantidad de Paracetamol');
    await user.clear(input);
    await user.type(input, '9');

    expect(screen.getByRole('alert')).toHaveTextContent('Máx. 5');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // Todavía no debería haberse confirmado el cambio (solo se valida al perder el foco)
    expect(propsBase.onActualizarCantidad).not.toHaveBeenCalled();
  });

  it('no muestra la advertencia cuando la cantidad escrita está dentro del stock', async () => {
    const user = userEvent.setup();
    render(<CarritoVentaItem {...propsBase} />);

    const input = screen.getByLabelText('Cantidad de Paracetamol');
    await user.clear(input);
    await user.type(input, '3');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('confirma la cantidad al perder el foco', async () => {
    const onActualizarCantidad = vi.fn();
    const user = userEvent.setup();
    render(<CarritoVentaItem {...propsBase} onActualizarCantidad={onActualizarCantidad} />);

    const input = screen.getByLabelText('Cantidad de Paracetamol');
    await user.clear(input);
    await user.type(input, '4');
    await user.tab();

    expect(onActualizarCantidad).toHaveBeenCalledWith(item, '4');
  });

  it('muestra cuánto falta para aplicar una promoción', () => {
    render(<CarritoVentaItem {...propsBase} item={{
      ...item,
      promocion: { cantidad_minima: 3, precio_promocion: 7 },
      promocionDisponible: true,
      promocionAplicada: false,
      precioAplicado: 8.5,
    }} />);

    expect(screen.getByText('Agrega 1 unidad más para aplicar la promoción')).toBeInTheDocument();
  });

  it('muestra el precio promocional cuando ya aplica', () => {
    render(<CarritoVentaItem {...propsBase} item={{
      ...item,
      cantidad: 3,
      promocion: { cantidad_minima: 3, precio_promocion: 7 },
      promocionDisponible: true,
      promocionAplicada: true,
      precioAplicado: 7,
    }} />);

    expect(screen.getByText(/Promoción aplicada/)).toBeInTheDocument();
    expect(screen.getByText(/21\.00/)).toBeInTheDocument();
  });
});
