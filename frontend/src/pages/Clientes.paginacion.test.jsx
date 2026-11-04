import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import Clientes from './Clientes';
import api from '../api/axios';
import { obtenerHistorialCompras } from '../api/clientes';

vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../api/clientes', () => ({ obtenerHistorialCompras: vi.fn() }));

function Ruta() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output aria-label="URL">{location.search}</output>
    <button onClick={() => navigate(-1)}>Volver atrás</button><Clientes /></>;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (ruta, config) => {
    if (ruta !== '/clientes') return { data: { id_cliente: 7, nombre_cliente: 'María López' } };
    const { pagina, limite, busqueda } = config.params;
    const total = busqueda ? 1 : 26;
    const efectiva = Math.min(pagina, Math.ceil(total / limite));
    return { data: { datos: [{ id_cliente: 7, nombre_cliente: busqueda ? 'Ana' : 'María López' }],
      paginacion: { pagina: efectiva, limite, total, total_paginas: Math.ceil(total / limite) } } };
  });
  obtenerHistorialCompras.mockImplementation(async (_id, { pagina, limite }) => ({
    compras: [{ id_venta: pagina, fecha_venta: '2026-10-01', cantidad_articulos: 1, total: '10', estado: 'completada' }],
    resumen: { total_compras: 26, total_articulos: 26, monto_total: '260' },
    paginacion: { pagina, limite, total: 26, total_paginas: 2 },
  }));
});

it('pagina en el servidor, restablece la página al buscar y restaura Atrás', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Ruta /></MemoryRouter>);
  await user.click(await screen.findByRole('link', { name: 'Siguiente' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/clientes', { params: { pagina: 2, limite: 25, busqueda: '' } }));
  await screen.findByRole('link', { name: 'Anterior' });
  await user.click(screen.getByRole('button', { name: 'Volver atrás' }));
  await waitFor(() => expect(screen.getByLabelText('URL')).toHaveTextContent(''));
  await screen.findByRole('link', { name: 'Siguiente' });
  await user.type(screen.getByRole('searchbox'), 'Ana');
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/clientes', { params: { pagina: 1, limite: 25, busqueda: 'Ana' } }));
  expect(await screen.findByText('Ana')).toBeInTheDocument();
  expect(screen.getByLabelText('URL')).not.toHaveTextContent('pagina=');
});

it('abre el historial desde la URL y pagina sin perder el resumen ni la página de clientes', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/?pagina=2&historial_cliente=7']}><Ruta /></MemoryRouter>);
  const dialog = await screen.findByRole('dialog', { name: 'Historial de ventas' });
  await user.click(await within(dialog).findByRole('link', { name: 'Siguiente' }));
  await waitFor(() => expect(obtenerHistorialCompras).toHaveBeenLastCalledWith(7, { pagina: 2, limite: 25 }));
  expect(await within(dialog).findByText('Venta #2')).toBeInTheDocument();
  expect(screen.getByLabelText('URL')).toHaveTextContent('pagina=2');
  expect(screen.getByLabelText('URL')).toHaveTextContent('historial_pagina=2');
  expect(within(dialog).getAllByText('26', { selector: 'p' })).toHaveLength(2);
  await user.click(within(dialog).getAllByRole('button', { name: 'Cerrar', exact: true })[0]);
  expect(screen.getByLabelText('URL')).not.toHaveTextContent('historial_');
});
