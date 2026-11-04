import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { obtenerVentas } from '../api/ventas';
import { obtenerCierres } from '../api/cajas';
import HistorialVentas from './ventas/HistorialVentas';
import HistorialCaja from './caja/HistorialCaja';
import HistorialVentasLayout from '../layouts/HistorialVentasLayout';

vi.mock('../api/ventas', () => ({ obtenerVentas: vi.fn() }));
vi.mock('../api/cajas', () => ({ obtenerCierres: vi.fn(), obtenerCajas: vi.fn().mockResolvedValue([]) }));
vi.mock('../hooks/useSucursales', () => ({ default: () => ({ sucursales: [], cargando: false, error: null }) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { rol: 'administrador' } }) }));
vi.mock('../components/caja/ResumenDiarioCaja', () => ({ default: () => null }));
vi.mock('../components/caja/CajaSubNav', () => ({ default: () => null }));
vi.mock('../components/ventas/historial/VentaDetalleModal', () => ({ default: () => null }));

function Ruta() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output aria-label="URL">{location.search}</output><button onClick={() => navigate(-1)}>Atrás</button><Outlet /></>;
}

function renderizar(ruta, consulta) {
  render(<MemoryRouter initialEntries={[`${ruta}?${consulta}`]}><Routes><Route element={<Ruta />}>
    <Route path="/ventas/historial" element={<HistorialVentasLayout />}><Route index element={<HistorialVentas />} /></Route>
    <Route path="/caja/historial" element={<HistorialCaja />} />
  </Route></Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  const responder = ({ pagina, limite }, venta) => {
    const total_paginas = Math.ceil(26 / limite);
    const efectiva = Math.min(pagina, total_paginas);
    return { paginacion: { pagina: efectiva, limite, total: 26, total_paginas }, datos: [venta
      ? { id_venta: efectiva, fecha_venta: '2026-10-15', nombre_cliente: `Página remota ${efectiva}`, total: 20 }
      : { id_sesion_caja: efectiva, fecha_hora_cierre: '2026-10-15', nombre_caja: `Página remota ${efectiva}`, total_ventas: 20 }] };
  };
  obtenerVentas.mockImplementation(async (filtros) => responder(filtros, true));
  obtenerCierres.mockImplementation(async (filtros) => responder(filtros, false));
});

it.each([
  ['/ventas/historial', obtenerVentas, 'Consultar'],
  ['/caja/historial', obtenerCierres, 'Aplicar filtros'],
])('pagina, cambia el tamaño y restaura Atrás en %s', async (ruta, consultar, aplicar) => {
  const user = userEvent.setup();
  renderizar(ruta, 'pagina=2&limite=10&fecha_desde=2026-10-01&fecha_hasta=2026-10-31');
  expect(await screen.findByText('Página remota 2')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Siguiente' }));
  expect(await screen.findByText('Página remota 3')).toBeInTheDocument();
  expect(consultar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 3, limite: 10,
    fecha_desde: '2026-10-01', fecha_hasta: '2026-10-31' }), expect.any(Object));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Por página' }), '25');
  expect(await screen.findByText('Página remota 1')).toBeInTheDocument();
  expect(screen.getByLabelText('URL')).not.toHaveTextContent('pagina=');
  await user.click(screen.getByRole('button', { name: 'Atrás' }));
  expect(await screen.findByText('Página remota 3')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Por página' })).toHaveValue('10');
  await user.click(screen.getByRole('button', { name: aplicar }));
  expect(await screen.findByText('Página remota 1')).toBeInTheDocument();
  expect(consultar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, limite: 10,
    fecha_desde: '2026-10-01', fecha_hasta: '2026-10-31' }), expect.any(Object));
});

it.each(['/ventas/historial', '/caja/historial'])('corrige una página fuera del rango en %s', async (ruta) => {
  renderizar(ruta, 'pagina=99&limite=10');
  await waitFor(() => {
    expect(screen.getByLabelText('URL')).toHaveTextContent('pagina=3');
    expect(screen.getByText('Página remota 3')).toBeInTheDocument();
  });
});
