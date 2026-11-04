import { ToastProvider } from '../../context/ToastContext.jsx';
import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render as renderBase, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LotesProducto from './LotesProducto';

const mocks = vi.hoisted(() => ({ total: 26, eliminar: vi.fn() }));
vi.mock('../../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ sucursalActivaId: 1, usuario: { rol: 'administrador' } }) }));
vi.mock('../../hooks/useProductos', () => ({ default: () => ({ productos: [{ id_producto: 7, nombre_comercial: 'Amoxicilina' }] }) }));
vi.mock('../../hooks/useProveedores', () => ({ default: () => ({ proveedores: [] }) }));
vi.mock('../../hooks/useSucursales', () => ({ default: () => ({ sucursales: [
  { id_sucursal: 1, nombre_sucursal: 'Central' }, { id_sucursal: 2, nombre_sucursal: 'Norte' },
] }) }));
vi.mock('../../hooks/useLotes', () => ({ default: () => ({ eliminar: mocks.eliminar, limpiarError: vi.fn() }) }));
vi.mock('../../components/inventario/stock/LoteFormModal', () => ({ default: () => null }));
vi.mock('../../components/inventario/stock/LoteStockAjusteModal', () => ({ default: () => null }));
vi.mock('../../components/inventario/stock/LoteDeleteModal', () => ({
  default: ({ isOpen, onConfirm }) => isOpen ? <button onClick={onConfirm}>Confirmar eliminación</button> : null,
}));

function Ruta() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output aria-label="URL">{location.search}</output><button onClick={() => navigate(-1)}>Atrás</button><Outlet /></>;
}
const mostrar = (consulta = 'pagina=2&sucursal=1') => render(
  <MemoryRouter initialEntries={[`/inventario/productos/7/lotes?${consulta}`]}><Routes><Route element={<Ruta />}>
    <Route path="/inventario/productos/:productoId/lotes" element={<LotesProducto />} />
  </Route></Routes></MemoryRouter>,
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.total = 26;
  mocks.eliminar.mockImplementation(async () => { mocks.total = 25; });
  api.get.mockImplementation(async (_ruta, { params }) => {
    const total = params.estado_stock ? 1 : mocks.total;
    const total_paginas = Math.max(1, Math.ceil(total / params.limite));
    const pagina = Math.min(params.pagina, total_paginas);
    return { data: { datos: [{ id_lote: pagina, numero_lote: `LOTE-PÁGINA-${pagina}`,
      id_producto: 7, id_sucursal: params.id_sucursal, estado_stock: params.estado_stock || 'normal',
      stock_actual: params.estado_stock === 'agotado' ? 0 : 5, precio_venta: 10 }],
      paginacion: { pagina, limite: params.limite, total, total_paginas } } };
  });
});

it('cambia de página y tamaño, conserva filtros y restaura Atrás', async () => {
  const user = userEvent.setup();
  mostrar('sucursal=1&pagina=1&limite=10&vencimiento=vencido');
  await user.click(await screen.findByRole('link', { name: 'Siguiente' }));
  expect(await screen.findByText('LOTE-PÁGINA-2')).toBeInTheDocument();
  expect(api.get).toHaveBeenLastCalledWith('/lotes/producto/7', { params: {
    pagina: 2, limite: 10, id_sucursal: '1', estado_vencimiento: 'vencido',
  } });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Por página' }), '25');
  expect(await screen.findByText('LOTE-PÁGINA-1')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Atrás' }));
  expect(await screen.findByText('LOTE-PÁGINA-2')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Por página' })).toHaveValue('10');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Sucursal' }), '2');
  expect(await screen.findByText('LOTE-PÁGINA-1')).toBeInTheDocument();
  expect(screen.getByLabelText('URL')).not.toHaveTextContent('pagina=');
  expect(api.get).toHaveBeenLastCalledWith('/lotes/producto/7', { params: {
    pagina: 1, limite: 10, id_sucursal: '2', estado_vencimiento: 'vencido',
  } });
});

it('filtra agotados en el servidor y reinicia la página al limpiar filtros', async () => {
  const user = userEvent.setup();
  mostrar();
  await screen.findByText('LOTE-PÁGINA-2');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Estado de stock' }), 'agotado');
  expect(await screen.findByText('LOTE-PÁGINA-1')).toBeInTheDocument();
  expect(api.get).toHaveBeenLastCalledWith('/lotes/producto/7', { params: {
    pagina: 1, limite: 25, id_sucursal: '1', estado_stock: 'agotado',
  } });
  await user.click(screen.getByRole('button', { name: 'Restablecer filtros' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/lotes/producto/7', {
    params: { pagina: 1, limite: 25, id_sucursal: '1' },
  }));
  expect(screen.getByLabelText('URL')).not.toHaveTextContent('stock=');
});

it('corrige la página después de eliminar el último lote de la última página', async () => {
  const user = userEvent.setup();
  mostrar();
  await user.click(await screen.findByRole('button', { name: 'Eliminar lote LOTE-PÁGINA-2' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
  await waitFor(() => {
    expect(screen.getByLabelText('URL')).toHaveTextContent('pagina=1');
    expect(screen.getByText('LOTE-PÁGINA-1')).toBeInTheDocument();
  });
  expect(mocks.eliminar).toHaveBeenCalledWith(2);
});

const render = (ui, options) => renderBase(<ToastProvider>{ui}</ToastProvider>, options);
