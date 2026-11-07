import { ToastProvider } from '../../context/ToastContext.jsx';
import React from 'react';
import { fireEvent, render as renderBase, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LotesProducto from './LotesProducto.jsx';
import InventarioProductosTable from '../../components/inventario/unificado/InventarioProductosTable.jsx';
import useScrollInventario from '../../hooks/useScrollInventario.js';

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

  const renderizar = (ruta = '/inventario/productos/7/lotes') => render(
    <MemoryRouter initialEntries={[ruta]}>
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

  it.each(['', '?volver=https%3A%2F%2Fejemplo.com', '?volver=%2Fusuarios', '?volver=%2F%2Fejemplo.com'])('ofrece un regreso local al abrir directamente el detalle %s', (consulta) => {
    renderizar(`/inventario/productos/7/lotes${consulta}`);
    expect(screen.getByRole('link', { name: 'Volver a existencias' })).toHaveAttribute('href', '/inventario');
  });

  it('conserva el origen al recargar y cambiar filtros de lotes', async () => {
    const user = userEvent.setup();
    const origen = '/inventario?q=Amoxicilina&pagina=3&limite=10&sucursal=2&estado_stock=poco_stock';
    renderizar(`/inventario/productos/7/lotes?sucursal=2&volver=${encodeURIComponent(origen)}`);
    await user.selectOptions(screen.getByLabelText('Estado de stock'), 'agotado');
    expect(screen.getByRole('link', { name: 'Volver a existencias' })).toHaveAttribute('href', origen);
  });

  it('fija la sucursal del dependiente aunque el enlace solicite otra', () => {
    mocks.useAuth.mockReturnValue({ sucursalActivaId: 2, usuario: { rol: 'dependiente', id_sucursal: 1 } });
    renderizar('/inventario/productos/7/lotes?sucursal=2');
    expect(screen.getByLabelText('Sucursal')).toHaveValue('1');
    expect(screen.getByLabelText('Sucursal')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Agregar lote' })).not.toBeInTheDocument();
  });

  it('restaura contexto y scroll después de desmontar el listado, con volver y con el historial', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const origen = '/inventario?q=Amoxicilina&pagina=3&limite=10&sucursal=1&estado_stock=poco_stock&estado_vencimiento=vencido';
    function Listado() {
      useScrollInventario(true);
      return <InventarioProductosTable productos={[{ id_producto: 7, nombre_comercial: 'Amoxicilina', activo: true }]} sucursalId={1} />;
    }
    function Navegacion() {
      const location = useLocation();
      const navigate = useNavigate();
      return <><output aria-label="Ruta de prueba">{location.pathname}{location.search}</output>
        <button onClick={() => navigate(-1)}>Atrás de prueba</button>
        <button onClick={() => navigate(1)}>Adelante de prueba</button></>;
    }
    render(<MemoryRouter initialEntries={[origen]}><Routes>
      <Route path="/inventario" element={<Listado />} />
      <Route path="/inventario/productos/:productoId/lotes" element={<LotesProducto />} />
    </Routes><Navegacion /></MemoryRouter>);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 320 });
    fireEvent.scroll(window);
    await user.click(screen.getByRole('link', { name: 'Ver lotes de Amoxicilina' }));
    expect(screen.getByText('Filtros: poco_stock / vencido')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado de stock')).toHaveValue('poco_stock');
    await user.click(screen.getByRole('button', { name: 'Atrás de prueba' }));
    expect(screen.getByLabelText('Ruta de prueba')).toHaveTextContent(origen);
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 320));
    await user.click(screen.getByRole('button', { name: 'Adelante de prueba' }));
    expect(screen.getByRole('heading', { name: 'Lotes de Amoxicilina' })).toBeInTheDocument();
    window.scrollTo.mockClear();
    await user.click(screen.getByRole('link', { name: 'Volver a existencias' }));
    expect(screen.getByLabelText('Ruta de prueba')).toHaveTextContent(origen);
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 320));
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });
});

const render = (ui, options) => renderBase(ui, { wrapper: ToastProvider, ...options });
