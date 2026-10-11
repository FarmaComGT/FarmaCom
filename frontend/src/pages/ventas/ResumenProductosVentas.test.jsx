import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useResumenProductos } from '../../hooks/useHistorialVentas';
import ResumenProductosVentas from './ResumenProductosVentas';

vi.mock('../../hooks/useHistorialVentas', () => ({ useResumenProductos: vi.fn() }));

const renderizar = () => render(
  <MemoryRouter initialEntries={['/ventas/historial/productos']}>
    <Routes>
      <Route path="/ventas/historial" element={<Outlet context={{ filtros: {} }} />}>
        <Route path="productos" element={<ResumenProductosVentas />} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

describe('ResumenProductosVentas', () => {
  it('muestra las columnas solicitadas y sus totales', () => {
    useResumenProductos.mockReturnValue({
      datos: [
        { id_producto: 1, nombre_producto: 'Acetaminofén', cantidad_vendida: 15, suma_total: 40 },
        { id_producto: 2, nombre_producto: 'Tabcin', cantidad_vendida: 10, suma_total: 35 },
      ],
      cargando: false,
      error: null,
      recargar: vi.fn(),
    });

    renderizar();

    expect(screen.getByRole('columnheader', { name: 'Cant. vendida' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre del producto' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Suma total' })).toBeInTheDocument();
    expect(screen.getByText('Acetaminofén')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/Q\s*75\.00/)).toBeInTheDocument();
  });

  it('muestra un estado vacío', () => {
    useResumenProductos.mockReturnValue({
      datos: [], cargando: false, error: null, recargar: vi.fn(),
    });
    renderizar();
    expect(screen.getByText('No hay productos vendidos en el período seleccionado.')).toBeInTheDocument();
  });
});
