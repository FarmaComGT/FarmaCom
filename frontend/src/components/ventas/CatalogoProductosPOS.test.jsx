import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CatalogoProductosPOS from './CatalogoProductosPOS';

const productos = [
  {
    id_producto: 1,
    codigo: 'MED-001',
    nombre_comercial: 'Paracetamol',
    nombre_generico: 'Acetaminofén',
    presentacion: 'Blíster',
    stock_disponible: 5,
    precio_minimo: 8.5,
    precio_maximo: 8.5,
    cantidad_lotes: 1,
    lotes: [{ id_lote: 1, numero_lote: 'L-001', stock_disponible: 5, precio_venta: 8.5 }],
    tiene_precio: true,
    estado_stock: 'normal',
    estado_vencimiento: 'normal',
  },
  {
    id_producto: 2,
    codigo: 'HIG-010',
    nombre_comercial: 'Pañales talla M',
    presentacion: 'Paquete',
    stock_disponible: 3,
    precio_minimo: 42,
    precio_maximo: 42,
    cantidad_lotes: 1,
    lotes: [{ id_lote: 2, numero_lote: 'L-002', stock_disponible: 3, precio_venta: 42 }],
    tiene_precio: true,
    estado_stock: 'poco_stock',
    estado_vencimiento: 'normal',
  },
];

const renderizarCatalogo = (onSeleccionar = vi.fn()) => {
  render(
    <CatalogoProductosPOS
      productos={productos}
      cargando={false}
      error={null}
      onSeleccionar={onSeleccionar}
      onRefrescar={() => {}}
    />,
  );
  return onSeleccionar;
};

describe('CatalogoProductosPOS', () => {
  it('filtra el catálogo mientras el usuario escribe', async () => {
    const user = userEvent.setup();
    renderizarCatalogo();

    await user.type(screen.getByLabelText('Buscar productos'), 'pañales');

    expect(screen.getByText('Pañales talla M')).toBeInTheDocument();
    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
  });

  it('selecciona el primer resultado al presionar Enter, como haría un lector', async () => {
    const user = userEvent.setup();
    const onSeleccionar = renderizarCatalogo();
    const buscador = screen.getByLabelText('Buscar productos');

    await user.type(buscador, 'MED-001{Enter}');

    expect(onSeleccionar).toHaveBeenCalledWith(productos[0]);
    expect(buscador).toHaveValue('MED-001');
  });
});
