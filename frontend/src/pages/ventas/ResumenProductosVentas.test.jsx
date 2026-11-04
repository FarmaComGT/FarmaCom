import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useResumenProductos } from '../../hooks/useHistorialVentas';
import ResumenProductosVentas from './ResumenProductosVentas';

vi.mock('../../hooks/useHistorialVentas', () => ({ useResumenProductos: vi.fn() }));

const renderizar = (ruta = '/ventas/historial/productos') => render(
  <MemoryRouter initialEntries={[ruta]}>
    <Routes>
      <Route path="/ventas/historial" element={<Outlet context={{ filtros: {} }} />}>
        <Route path="productos" element={<ResumenProductosVentas />} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

describe('ResumenProductosVentas', () => {
  it('presenta los productos y sus totales con formato localizado', () => {
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

    expect(screen.getByRole('columnheader', { name: 'Producto' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Unidades vendidas' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Ingresos generados' })).toBeInTheDocument();
    expect(screen.getByText('Acetaminofén')).toBeInTheDocument();
    expect(screen.getByText('Producto #1')).toBeInTheDocument();

    const totales = screen.getByLabelText('Totales de productos vendidos');
    expect(within(totales).getByText('25')).toBeInTheDocument();
    expect(within(totales).getByText(/Q\s*75\.00/)).toBeInTheDocument();
    expect(document.title).toBe('Resumen de productos vendidos · FarmaCom');
  });

  it('muestra un estado vacío con una acción siguiente clara', () => {
    useResumenProductos.mockReturnValue({
      datos: [], cargando: false, error: null, recargar: vi.fn(),
    });

    renderizar();

    expect(screen.getByText('No hay productos vendidos en el período seleccionado.')).toBeInTheDocument();
    expect(screen.getByText('Prueba con otra sucursal o amplía el rango de fechas.')).toBeInTheDocument();
  });

  it('mantiene la estructura de la tabla durante la carga', () => {
    useResumenProductos.mockReturnValue({
      datos: [], cargando: true, error: null, recargar: vi.fn(),
    });

    renderizar();

    expect(screen.getByRole('status', { name: 'Cargando resumen por producto' })).toBeInTheDocument();
  });

  it('explica el error y permite reintentar', async () => {
    const user = userEvent.setup();
    const recargar = vi.fn();
    useResumenProductos.mockReturnValue({
      datos: [], cargando: false, error: 'No se pudo consultar el resumen.', recargar,
    });

    renderizar();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo consultar el resumen.');

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(recargar).toHaveBeenCalledOnce();
  });

  it('pagina listas extensas y conserva su página independiente en la URL', async () => {
    const user = userEvent.setup();
    const datos = Array.from({ length: 30 }, (_, indice) => ({
      id_producto: indice + 1,
      nombre_producto: `Producto ${indice + 1}`,
      cantidad_vendida: indice + 1,
      suma_total: (indice + 1) * 10,
    }));
    useResumenProductos.mockReturnValue({
      datos, cargando: false, error: null, recargar: vi.fn(),
    });

    renderizar();

    expect(screen.getByText('Producto 25')).toBeInTheDocument();
    expect(screen.queryByText('Producto 26')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Siguiente' }));

    expect(await screen.findByText('Producto 26')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anterior' }))
      .toHaveAttribute('href', expect.stringContaining('productos_pagina=1'));
  });
});
