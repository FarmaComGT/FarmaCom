import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useVentas } from '../../hooks/useHistorialVentas';
import HistorialVentas from './HistorialVentas';

vi.mock('../../hooks/useHistorialVentas', () => ({ useVentas: vi.fn() }));
vi.mock('../../components/ventas/historial/VentaDetalleModal', () => ({
  default: ({ idVenta, onClose, onVentaAnulada }) => (idVenta ? (
    <div>
      <p>Detalle abierto de la venta {idVenta}</p>
      <button type="button" onClick={onClose}>Cerrar detalle simulado</button>
      <button type="button" onClick={() => onVentaAnulada({ id_venta: idVenta })}>Anular simulado</button>
    </div>
  ) : null),
}));

const ventaCompletada = {
  id_venta: 8,
  fecha_venta: 'fecha-invalida',
  nombre_sucursal: 'Central',
  nombre_cliente: 'María López',
  nombre_usuario: 'Ana',
  cantidad_articulos: 3,
  metodo_pago: 'efectivo',
  total: 50,
  estado: 'completada',
};

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

  it('muestra el estado de carga', () => {
    useVentas.mockReturnValue({ datos: [], cargando: true, error: null, recargar: vi.fn() });
    renderizar();
    expect(screen.getByRole('status', { name: 'Cargando historial de ventas' })).toBeInTheDocument();
  });

  it('permite reintentar cuando falla la carga', async () => {
    const user = userEvent.setup();
    const recargar = vi.fn();
    useVentas.mockReturnValue({ datos: [], cargando: false, error: 'Sin conexión', recargar });
    renderizar();

    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('abre el detalle de una venta y lo cierra', async () => {
    const user = userEvent.setup();
    useVentas.mockReturnValue({ datos: [ventaCompletada], cargando: false, error: null, recargar: vi.fn() });
    renderizar();

    expect(screen.getByText('María López')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver detalle de venta 8' }));
    expect(screen.getByText('Detalle abierto de la venta 8')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar detalle simulado' }));
    expect(screen.queryByText('Detalle abierto de la venta 8')).not.toBeInTheDocument();
  });

  it('recarga el historial cuando se cancela una venta desde el detalle', async () => {
    const user = userEvent.setup();
    const recargar = vi.fn();
    useVentas.mockReturnValue({ datos: [ventaCompletada], cargando: false, error: null, recargar });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Ver detalle de venta 8' }));
    await user.click(screen.getByRole('button', { name: 'Anular simulado' }));

    expect(recargar).toHaveBeenCalledWith({ id_venta: 8 });
  });
});
