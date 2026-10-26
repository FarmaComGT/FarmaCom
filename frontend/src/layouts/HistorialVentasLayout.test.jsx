import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearFiltrosInicialesHistorial } from '../utils/filtrosHistorialVentas';
import HistorialVentasLayout from './HistorialVentasLayout.jsx';

const sucursalesMock = vi.hoisted(() => ({
  valor: { sucursales: [], cargando: false, error: null },
}));

vi.mock('../hooks/useSucursales', () => ({ default: () => sucursalesMock.valor }));

function VistaVentas() {
  const { filtros } = useOutletContext();
  return <pre data-testid="filtros-aplicados">{JSON.stringify(filtros)}</pre>;
}

const renderizar = () => render(
  <MemoryRouter initialEntries={['/ventas/historial']}>
    <Routes>
      <Route path="/ventas/historial" element={<HistorialVentasLayout />}>
        <Route index element={<VistaVentas />} />
        <Route path="productos" element={<p>Vista de resumen por producto</p>} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

const filtrosAplicados = () => JSON.parse(screen.getByTestId('filtros-aplicados').textContent);

describe('layout del historial de ventas', () => {
  beforeEach(() => {
    sucursalesMock.valor = {
      sucursales: [
        { id_sucursal: 1, nombre_sucursal: 'Central' },
        { id_sucursal: 2, nombre_sucursal: 'Norte' },
      ],
      cargando: false,
      error: null,
    };
  });

  it('aplica por defecto los últimos 30 días de todas las sucursales', () => {
    renderizar();
    const iniciales = crearFiltrosInicialesHistorial();

    expect(screen.getByRole('heading', { name: 'Historial de ventas' })).toBeInTheDocument();
    expect(filtrosAplicados()).toEqual(iniciales);
    expect(screen.getByLabelText('Fecha inicial')).toHaveValue(iniciales.fecha_desde);
    expect(screen.getByLabelText('Fecha final')).toHaveValue(iniciales.fecha_hasta);
  });

  it('marca la pestaña activa y navega al resumen por producto', async () => {
    const user = userEvent.setup();
    renderizar();

    const navegacion = screen.getByRole('navigation', { name: 'Vistas del historial de ventas' });
    expect(navegacion).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ventas' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('link', { name: 'Resumen por producto' }));

    expect(screen.getByText('Vista de resumen por producto')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Resumen por producto' })).toHaveAttribute('aria-current', 'page');
  });

  it('consulta con la sucursal y el rango elegidos', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.selectOptions(screen.getByLabelText('Sucursal'), '2');
    await user.clear(screen.getByLabelText('Fecha inicial'));
    await user.type(screen.getByLabelText('Fecha inicial'), '2026-10-01');
    await user.clear(screen.getByLabelText('Fecha final'));
    await user.type(screen.getByLabelText('Fecha final'), '2026-10-15');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(filtrosAplicados()).toEqual({ id_sucursal: 2, fecha_desde: '2026-10-01', fecha_hasta: '2026-10-15' });
  });

  it('no aplica un rango invertido y explica el motivo', async () => {
    const user = userEvent.setup();
    renderizar();
    const antes = filtrosAplicados();

    await user.clear(screen.getByLabelText('Fecha inicial'));
    await user.type(screen.getByLabelText('Fecha inicial'), '2026-10-20');
    await user.clear(screen.getByLabelText('Fecha final'));
    await user.type(screen.getByLabelText('Fecha final'), '2026-10-01');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('La fecha inicial no puede ser posterior a la fecha final.');
    expect(filtrosAplicados()).toEqual(antes);
  });

  it('limpia el error al corregir un filtro', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.clear(screen.getByLabelText('Fecha final'));
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Selecciona una fecha inicial y una fecha final.');

    await user.type(screen.getByLabelText('Fecha final'), '2099-01-01');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('restablece los filtros iniciales', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.selectOptions(screen.getByLabelText('Sucursal'), '1');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(filtrosAplicados().id_sucursal).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(filtrosAplicados()).toEqual(crearFiltrosInicialesHistorial());
    expect(screen.getByLabelText('Sucursal')).toHaveValue('');
  });

  it('deshabilita el selector mientras cargan las sucursales y muestra su error', () => {
    sucursalesMock.valor = { sucursales: [], cargando: true, error: 'No se pudieron cargar las sucursales.' };
    renderizar();

    expect(screen.getByLabelText('Sucursal')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las sucursales.');
  });
});
