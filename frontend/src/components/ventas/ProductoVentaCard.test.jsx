import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductoVentaCard from './ProductoVentaCard';

const producto = {
  id_producto: 1,
  nombre_comercial: 'Paracetamol',
  nombre_generico: 'Acetaminofén',
  codigo: 'MED-001',
  presentacion: 'Tableta',
  stock_disponible: 20,
  precio_minimo: 10,
  precio_maximo: 10,
  tiene_precio: true,
  cantidad_lotes: 2,
  lotes: [{ id_lote: 1 }, { id_lote: 2 }],
  promocion: {
    cantidad_minima: 3,
    precio_promocion: 7.5,
    fecha_fin: '2026-12-31',
  },
};

describe('ProductoVentaCard', () => {
  it('muestra el precio normal, el promocional y sus condiciones', () => {
    render(<ProductoVentaCard producto={producto} onSeleccionar={vi.fn()} busqueda="" />);

    expect(screen.getByText(/10\.00/)).toHaveClass('line-through');
    expect(screen.getByText(/7\.50/)).toBeInTheDocument();
    expect(screen.getByText(/Promo desde 3 unidades · hasta 31\/12\/2026/)).toBeInTheDocument();
    expect(screen.getByText('2 lotes disponibles')).toBeInTheDocument();
    expect(screen.getByText('Selecciona el lote que deseas vender')).toBeInTheDocument();
  });

  it('oculta una promoción que no reduzca el precio normal', () => {
    render(<ProductoVentaCard
      producto={{
        ...producto,
        promocion: { ...producto.promocion, precio_promocion: 10 },
      }}
      onSeleccionar={vi.fn()}
      busqueda=""
    />);

    expect(screen.getByText(/10\.00/)).not.toHaveClass('line-through');
    expect(screen.queryByText(/Promo desde/)).not.toBeInTheDocument();
  });
});
