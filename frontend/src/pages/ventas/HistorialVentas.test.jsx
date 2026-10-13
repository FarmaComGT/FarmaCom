import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useVentas } from '../../hooks/useHistorialVentas';
import HistorialVentas from './HistorialVentas';

vi.mock('../../hooks/useHistorialVentas', () => ({ useVentas: vi.fn() }));
vi.mock('../../components/ventas/historial/VentaDetalleModal', () => ({
  default: () => null,
}));

const renderizar = () => render(
  <MemoryRouter initialEntries={['/ventas/historial']}>
    <Routes>
      <Route path="/ventas/historial" element={<Outlet context={{ filtros: {} }} />}>
        <Route index element={<HistorialVentas />} />
      </Route>
    </Routes>
  </MemoryRouter>,
);

describe('HistorialVentas', () => {
  it('muestra la información general de cada venta', () => {
    useVentas.mockReturnValue({
      datos: [{
        id_venta: 8,
        fecha_venta: '2026-10-10T15:30:00.000Z',
        nombre_sucursal: 'Central',
        nombre_cliente: null,
        nombre_usuario: 'Ana',
        cantidad_articulos: 3,
        metodo_pago: 'efectivo',
        total: 50,
        estado: 'completada',
      }],
      cargando: false,
      error: null,
      recargar: vi.fn(),
    });

    renderizar();

    expect(screen.getByText('#8')).toBeInTheDocument();
    expect(screen.getByText('Consumidor final')).toBeInTheDocument();
    expect(screen.getByText('Central')).toBeInTheDocument();
    expect(screen.getByText(/Q\s*50\.00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver detalle de venta 8' })).toBeInTheDocument();
  });

  it('muestra un estado vacío para el período', () => {
    useVentas.mockReturnValue({ datos: [], cargando: false, error: null, recargar: vi.fn() });
    renderizar();
    expect(screen.getByText('No hay ventas en el período seleccionado.')).toBeInTheDocument();
  });
});
