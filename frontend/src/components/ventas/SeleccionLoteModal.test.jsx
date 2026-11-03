import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SeleccionLoteModal from './SeleccionLoteModal';

const producto = {
  nombre_comercial: 'Paracetamol',
  promocion: { cantidad_minima: 3, precio_promocion: 7 },
  lotes: [
    {
      id_lote: 2,
      numero_lote: 'L-002',
      fecha_vencimiento: null,
      stock_disponible: 8,
      precio_venta: 10,
      tiene_precio: true,
      estado_vencimiento: 'normal',
    },
    {
      id_lote: 3,
      numero_lote: 'L-003',
      fecha_vencimiento: '2026-12-01',
      stock_disponible: 2,
      precio_venta: 11,
      tiene_precio: true,
      estado_vencimiento: 'proximo_a_vencer',
    },
  ],
};

describe('SeleccionLoteModal', () => {
  it('muestra todos los lotes disponibles con sus condiciones', () => {
    render(<SeleccionLoteModal producto={producto} onClose={vi.fn()} onSeleccionar={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Seleccionar lote L-002' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seleccionar lote L-003' })).toBeInTheDocument();
    expect(screen.getByText('Sin fecha de vencimiento')).toBeInTheDocument();
    expect(screen.getByText(/Próximo a vencer · Vence 01\/12\/2026/)).toBeInTheDocument();
    expect(screen.getByText('8 unidades')).toBeInTheDocument();
    expect(screen.getByText('2 lotes · 10 unidades disponibles')).toBeInTheDocument();
    expect(screen.getAllByText(/Promoción desde 3 unidades/)).toHaveLength(2);
  });

  it('devuelve exclusivamente el lote elegido', async () => {
    const onSeleccionar = vi.fn();
    const user = userEvent.setup();
    render(
      <SeleccionLoteModal
        producto={producto}
        onClose={vi.fn()}
        onSeleccionar={onSeleccionar}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Seleccionar lote L-003' }));

    expect(onSeleccionar).toHaveBeenCalledWith(producto.lotes[1]);
  });

  it('explica y deshabilita un lote que todavía no tiene precio', () => {
    render(<SeleccionLoteModal
      producto={{
        ...producto,
        lotes: [{
          ...producto.lotes[0], precio_venta: null, tiene_precio: false,
        }],
      }}
      onClose={vi.fn()}
      onSeleccionar={vi.fn()}
    />);

    expect(screen.getByRole('button', { name: 'Seleccionar lote L-002' })).toBeDisabled();
    expect(screen.getByText('Este lote no puede venderse hasta registrar un precio.')).toBeInTheDocument();
  });

  it('ofrece una salida cuando el producto no contiene lotes', () => {
    render(<SeleccionLoteModal
      producto={{ ...producto, lotes: [] }}
      onClose={vi.fn()}
      onSeleccionar={vi.fn()}
    />);

    expect(screen.getByText('No hay lotes disponibles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });
});
