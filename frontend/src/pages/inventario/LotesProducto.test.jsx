import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LotesProducto from './LotesProducto.jsx';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../hooks/useProductos.js', () => ({
  default: () => ({
    productos: [{
      id_producto: 7,
      nombre_comercial: 'Amoxicilina',
      codigo: 'MED-007',
      precio_compra: 12,
      activo: true,
    }],
    cargando: false,
    error: null,
  }),
}));
vi.mock('../../hooks/useProveedores.js', () => ({
  default: () => ({ proveedores: [], cargando: false }),
}));
vi.mock('../../hooks/useSucursales.js', () => ({
  default: () => ({
    sucursales: [{ id_sucursal: 1, nombre_sucursal: 'Central' }],
    cargando: false,
  }),
}));
vi.mock('../../hooks/useLotes.js', () => ({
  default: () => ({
    guardando: false,
    error: null,
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    limpiarError: vi.fn(),
  }),
}));
vi.mock('../../components/inventario/stock/LotesDeProductoTable.jsx', () => ({
  default: ({ filtroStock, filtroVencimiento }) => (
    <div>Filtros: {filtroStock || 'todos'} / {filtroVencimiento || 'todos'}</div>
  ),
}));
vi.mock('../../components/inventario/stock/LoteFormModal.jsx', () => ({
  default: ({ isOpen, productoInicialId, bloquearProducto }) => isOpen
    ? <div>Formulario {productoInicialId} {bloquearProducto ? 'fijo' : ''}</div>
    : null,
}));
vi.mock('../../components/inventario/stock/LoteDeleteModal.jsx', () => ({ default: () => null }));

describe('detalle de lotes por producto', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({
      sucursalActivaId: 1,
      usuario: { rol: 'administrador' },
    });
  });

  const renderizar = () => render(
    <MemoryRouter initialEntries={['/inventario/productos/7/lotes']}>
      <Routes>
        <Route path="/inventario/productos/:productoId/lotes" element={<LotesProducto />} />
      </Routes>
    </MemoryRouter>,
  );

  it('muestra el producto y abre un lote con el producto fijo', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByRole('heading', { name: 'Lotes de Amoxicilina' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Agregar lote' }));
    expect(screen.getByText('Formulario 7 fijo')).toBeInTheDocument();
  });

  it('mantiene separados los filtros de stock y vencimiento', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.selectOptions(screen.getByLabelText('Estado de stock'), 'agotado');
    await user.selectOptions(screen.getByLabelText('Estado de vencimiento'), 'vencido');

    expect(screen.getByText('Filtros: agotado / vencido')).toBeInTheDocument();
  });
});
