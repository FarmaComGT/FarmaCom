import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useLotesProducto from '../../../hooks/useLotesProducto.js';
import LotesDeProductoTable from './LotesDeProductoTable.jsx';

vi.mock('../../../hooks/useLotesProducto.js');

const loteBase = {
  id_producto: 1,
  id_sucursal: 2,
  fecha_ingreso: '2026-01-10',
  fecha_vencimiento: '2027-01-10',
  presentacion: 'unidad',
  precio_venta: 5,
  estado_vencimiento: 'normal',
};

const lotes = [
  {
    ...loteBase,
    id_lote: 10,
    numero_lote: 'LT-ACTIVO',
    stock_actual: 8,
    estado_stock: 'normal',
  },
  {
    ...loteBase,
    id_lote: 11,
    numero_lote: 'LT-AGOTADO',
    stock_actual: 0,
    estado_stock: 'agotado',
  },
];

const renderizarTabla = (props = {}) => render(
  <LotesDeProductoTable
    producto={{ id_producto: 1 }}
    sucursalId={2}
    activo
    {...props}
  />,
);

describe('LotesDeProductoTable', () => {
  beforeEach(() => {
    useLotesProducto.mockReturnValue({ lotes, cargando: false, error: null });
  });

  it('oculta los lotes agotados inicialmente y permite consultarlos', async () => {
    const user = userEvent.setup();
    renderizarTabla();

    expect(screen.getByText('LT-ACTIVO')).toBeInTheDocument();
    expect(screen.queryByText('LT-AGOTADO')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver lotes agotados (1)' }));

    expect(screen.getByText('LT-AGOTADO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar lotes agotados (1)' })).toBeInTheDocument();
  });

  it('mantiene disponibles las acciones de los lotes agotados', async () => {
    const user = userEvent.setup();
    const onEditar = vi.fn();
    const onEliminar = vi.fn();
    renderizarTabla({ onEditar, onEliminar });

    await user.click(screen.getByRole('button', { name: 'Ver lotes agotados (1)' }));
    await user.click(screen.getByRole('button', { name: 'Editar lote LT-AGOTADO' }));

    expect(onEditar).toHaveBeenCalledWith(expect.objectContaining({ id_lote: 11 }));
  });

  it('explica cuando todos los lotes se encuentran agotados', () => {
    useLotesProducto.mockReturnValue({
      lotes: [lotes[1]],
      cargando: false,
      error: null,
    });

    renderizarTabla();

    expect(screen.getByText('No hay lotes con existencias en esta sucursal.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver lotes agotados (1)' })).toBeInTheDocument();
  });

  it('aplica por separado los filtros de stock y vencimiento', () => {
    useLotesProducto.mockReturnValue({
      lotes: [
        ...lotes,
        {
          ...loteBase,
          id_lote: 12,
          numero_lote: 'LT-VENCIDO',
          stock_actual: 3,
          estado_stock: 'normal',
          estado_vencimiento: 'vencido',
        },
      ],
      cargando: false,
      error: null,
    });

    renderizarTabla({ filtroStock: 'normal', filtroVencimiento: 'vencido' });

    expect(screen.getByText('LT-VENCIDO')).toBeInTheDocument();
    expect(screen.queryByText('LT-ACTIVO')).not.toBeInTheDocument();
    expect(screen.queryByText('LT-AGOTADO')).not.toBeInTheDocument();
  });

  it('muestra directamente los lotes cuando se filtra por agotados', () => {
    renderizarTabla({ filtroStock: 'agotado' });

    expect(screen.getByText('LT-AGOTADO')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lotes agotados/i })).not.toBeInTheDocument();
  });
});
