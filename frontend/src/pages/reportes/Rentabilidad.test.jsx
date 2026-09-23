import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Rentabilidad from './Rentabilidad';
import ReportesLayout from '../../layouts/ReportesLayout';
import Reportes from './Reportes';
import * as api from '../../api/reportes';

vi.mock('../../api/reportes', () => ({
  obtenerRentabilidad: vi.fn(), obtenerResumenVentas: vi.fn(),
  obtenerSerieVentas: vi.fn(), obtenerMetodosPago: vi.fn(), obtenerTopProductos: vi.fn(),
}));
vi.mock('../../hooks/useSucursales', () => ({
  default: () => ({ sucursales: [{ id_sucursal: 2, nombre_sucursal: 'Centro' }], cargando: false, error: null }),
}));

describe('vista independiente de rentabilidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.obtenerRentabilidad.mockResolvedValue([
      { id_sucursal: 2, nombre_sucursal: 'Centro', ingresos: 100, costo: 60, utilidad: 40, margen: 40 },
    ]);
    api.obtenerResumenVentas.mockResolvedValue({});
    api.obtenerSerieVentas.mockResolvedValue([]);
    api.obtenerMetodosPago.mockResolvedValue([]);
    api.obtenerTopProductos.mockResolvedValue([]);
  });

  it('navega desde ventas y aplica filtros propios sin consultar otros reportes', async () => {
    render(
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route path="/reports" element={<ReportesLayout />}>
            <Route index element={<Reportes />} />
            <Route path="rentabilidad" element={<Rentabilidad />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.obtenerResumenVentas).toHaveBeenCalledOnce());
    const encabezado = screen.getByRole('heading', { name: 'Reportes' });
    const navegacion = screen.getByRole('navigation', { name: 'Tipos de reportes' });
    expect(api.obtenerRentabilidad).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sucursal' }), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(api.obtenerResumenVentas).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('link', { name: 'Rentabilidad por sucursal' }));
    expect(screen.getByRole('heading', { name: 'Rentabilidad de todas las sucursales' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resumen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Agrupar por' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sucursal' })).toHaveValue('');
    await waitFor(() => expect(api.obtenerRentabilidad).toHaveBeenCalledOnce());
    expect(screen.getByRole('heading', { name: 'Reportes' })).toBe(encabezado);
    expect(screen.getByRole('navigation', { name: 'Tipos de reportes' })).toBe(navegacion);
    expect(await screen.findByRole('table')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sucursal' }), '2');
    expect(screen.getByRole('heading', { name: 'Rentabilidad de todas las sucursales' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-01-31' } });
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(api.obtenerRentabilidad).toHaveBeenLastCalledWith(
      { id_sucursal: 2, fecha_desde: '2026-01-01', fecha_hasta: '2026-01-31' },
      { signal: expect.any(AbortSignal) },
    ));
    expect(api.obtenerResumenVentas).toHaveBeenCalledTimes(2);
    expect(api.obtenerTopProductos).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', { name: 'Rentabilidad de Centro' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Restablecer filtros' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rentabilidad de todas las sucursales' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Ventas' }));
    expect(screen.getByRole('heading', { name: 'Reportes' })).toBe(encabezado);
    expect(screen.getByRole('navigation', { name: 'Tipos de reportes' })).toBe(navegacion);
  });
});
