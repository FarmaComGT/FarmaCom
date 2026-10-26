import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Inventario from './Inventario.jsx';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  crearProducto: vi.fn(),
  crearLote: vi.fn(),
  refrescarInventario: vi.fn(),
  sucursalConsultada: vi.fn(),
  sucursales: [],
}));

const productos = [
  {
    id_producto: 1,
    codigo: 'MED001-TAB',
    nombre_comercial: 'Paracetamol',
    nombre_generico: 'Paracetamol',
    presentacion: 'Tableta',
    categoria_nombre: 'Analgésicos',
    casa_nombre: 'Casa A',
    id_categoria: 1,
    stock_total: 4,
    stock_minimo: 5,
    estado_stock: 'poco_stock',
    estado_vencimiento: 'proximo_a_vencer',
    total_lotes: 1,
    activo: true,
  },
  {
    id_producto: 2,
    codigo: 'MED002-JAR',
    nombre_comercial: 'Loratadina',
    nombre_generico: 'Loratadina',
    presentacion: 'Jarabe',
    categoria_nombre: 'Antialérgicos',
    casa_nombre: 'Casa B',
    id_categoria: 2,
    stock_total: 0,
    stock_minimo: 3,
    estado_stock: 'agotado',
    estado_vencimiento: 'vencido',
    total_lotes: 2,
    activo: false,
  },
];

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../hooks/useInventarioSucursal.js', () => ({
  default: (idSucursal) => ({
    ...mocks.sucursalConsultada(idSucursal),
    productos,
    resumen: {
      total_productos: 2,
      productos_agotados: 1,
      productos_poco_stock: 1,
      productos_vencidos: 1,
      productos_proximos_vencer: 1,
    },
    cargando: false,
    error: null,
    refrescar: mocks.refrescarInventario,
  }),
}));
vi.mock('../../hooks/useProductos.js', () => ({
  default: () => ({
    productos,
    cargando: false,
    error: null,
    crear: mocks.crearProducto,
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
  }),
}));
vi.mock('../../hooks/useCategorias.js', () => ({
  default: () => ({
    categorias: [
      { id_categoria: 1, nombre: 'Analgésicos' },
      { id_categoria: 2, nombre: 'Antialérgicos' },
    ],
    cargando: false,
  }),
}));
vi.mock('../../hooks/useCasas.js', () => ({ default: () => ({ casas: [], cargando: false }) }));
vi.mock('../../hooks/useProveedores.js', () => ({ default: () => ({ proveedores: [], cargando: false }) }));
vi.mock('../../hooks/useSucursales.js', () => ({
  default: () => ({
    sucursales: mocks.sucursales,
    cargando: false,
  }),
}));
vi.mock('../../hooks/usePresentaciones.js', () => ({
  default: () => ({
    presentaciones: [],
    cargando: false,
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  }),
}));
vi.mock('../../hooks/useLotes.js', () => ({
  default: () => ({
    guardando: false,
    error: null,
    crear: mocks.crearLote,
    limpiarError: vi.fn(),
  }),
}));
vi.mock('../../components/inventario/productos/ProductoFormModal.jsx', () => ({
  default: ({ isOpen }) => isOpen ? <div>Formulario de producto abierto</div> : null,
}));
vi.mock('../../components/inventario/stock/LoteFormModal.jsx', () => ({
  default: ({ isOpen, onSubmit }) => isOpen ? (
    <button type="button" onClick={() => onSubmit({ numero_lote: 'LT-001' })}>
      Formulario de lote abierto
    </button>
  ) : null,
}));
vi.mock('../../components/inventario/productos/HistorialPrecioProductoModal.jsx', () => ({
  default: () => null,
}));

describe('Inventario unificado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sucursales = [{ id_sucursal: 1, nombre_sucursal: 'Central' }];
    mocks.useAuth.mockReturnValue({
      sucursalActivaId: 1,
      usuario: { rol: 'administrador' },
    });
    mocks.crearLote.mockResolvedValue({});
    mocks.refrescarInventario.mockResolvedValue(undefined);
  });

  const renderizar = () => render(
    <MemoryRouter>
      <Inventario />
    </MemoryRouter>,
  );

  it('muestra productos y estados independientes', () => {
    renderizar();

    expect(screen.getByRole('heading', { name: 'Inventario' })).toBeInTheDocument();
    expect(screen.getAllByText('Paracetamol').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Poco stock').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Próximo a vencer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agotado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vencido').length).toBeGreaterThan(0);
  });

  it('combina los filtros de stock y vencimiento', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.selectOptions(screen.getByLabelText('Stock'), 'poco_stock');
    await usuario.selectOptions(screen.getByLabelText('Vencimiento'), 'vencido');

    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
    expect(screen.queryByText('Loratadina')).not.toBeInTheDocument();
    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeInTheDocument();
  });

  it('filtra los agotados desde el resumen y quita el filtro al pulsar de nuevo', async () => {
    const usuario = userEvent.setup();
    renderizar();
    const agotados = screen.getByRole('button', { name: /Agotados/ });

    await usuario.click(agotados);

    expect(agotados).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Stock')).toHaveValue('agotado');
    expect(screen.queryByRole('button', { name: 'Ver lotes de Paracetamol' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver lotes de Loratadina' })).toBeInTheDocument();

    await usuario.click(agotados);

    expect(agotados).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Stock')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Ver lotes de Paracetamol' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver lotes de Loratadina' })).toBeInTheDocument();
  });

  it('limpia stock y vencimiento desde Productos y conserva la categoría y el catálogo', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.selectOptions(screen.getByLabelText('Categoría'), '1');
    await usuario.selectOptions(screen.getByLabelText('Catálogo'), 'true');
    await usuario.click(screen.getByRole('button', { name: /Agotados/ }));
    await usuario.click(screen.getByRole('button', { name: /Vencidos/ }));
    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeInTheDocument();

    const resumenProductos = screen.getByRole('button', { name: /Productos/ });
    await usuario.click(resumenProductos);

    expect(resumenProductos).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Stock')).toHaveValue('');
    expect(screen.getByLabelText('Vencimiento')).toHaveValue('');
    expect(screen.getByLabelText('Categoría')).toHaveValue('1');
    expect(screen.getByLabelText('Catálogo')).toHaveValue('true');
    expect(screen.getByRole('button', { name: 'Ver lotes de Paracetamol' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver lotes de Loratadina' })).not.toBeInTheDocument();
  });

  it.each(['  pArAcEtAmOl  ', 'MED001-TAB'])('busca productos por texto: %s', async (busqueda) => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar productos' }), busqueda);

    expect(screen.getByRole('button', { name: 'Ver lotes de Paracetamol' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver lotes de Loratadina' })).not.toBeInTheDocument();

    await usuario.clear(screen.getByRole('searchbox', { name: 'Buscar productos' }));

    expect(screen.getByRole('button', { name: 'Ver lotes de Loratadina' })).toBeInTheDocument();
  });

  it('combina la categoría con los productos activos e inactivos', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.selectOptions(screen.getByLabelText('Categoría'), '2');
    expect(screen.queryByRole('button', { name: 'Ver lotes de Paracetamol' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver lotes de Loratadina' })).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Catálogo'), 'true');
    expect(screen.getByText('No hay productos que coincidan con los filtros.')).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Catálogo'), 'false');
    expect(screen.getByRole('button', { name: 'Ver lotes de Loratadina' })).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Categoría'), '');
    await usuario.selectOptions(screen.getByLabelText('Catálogo'), 'true');
    expect(screen.getByRole('button', { name: 'Ver lotes de Paracetamol' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver lotes de Loratadina' })).not.toBeInTheDocument();
  });

  it('consulta otra sucursal y limpia la búsqueda y todos los filtros', async () => {
    const usuario = userEvent.setup();
    mocks.sucursales.push({ id_sucursal: 2, nombre_sucursal: 'Norte' });
    renderizar();

    expect(mocks.sucursalConsultada).toHaveBeenLastCalledWith(1);
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar productos' }), 'Paracetamol');
    await usuario.selectOptions(screen.getByLabelText('Categoría'), '1');
    await usuario.selectOptions(screen.getByLabelText('Catálogo'), 'true');
    await usuario.selectOptions(screen.getByLabelText('Stock'), 'poco_stock');
    await usuario.selectOptions(screen.getByLabelText('Vencimiento'), 'proximo_a_vencer');

    await usuario.selectOptions(screen.getByLabelText('Sucursal'), '2');

    expect(mocks.sucursalConsultada).toHaveBeenLastCalledWith(2);
    expect(screen.getByLabelText('Sucursal')).toHaveValue('2');
    expect(screen.getByRole('searchbox', { name: 'Buscar productos' })).toHaveValue('');
    for (const filtro of ['Categoría', 'Catálogo', 'Stock', 'Vencimiento']) {
      expect(screen.getByLabelText(filtro)).toHaveValue('');
    }
    expect(screen.getByRole('button', { name: 'Ver lotes de Paracetamol' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver lotes de Loratadina' })).toBeInTheDocument();
  });

  it('oculta la gestión de lotes y el historial para un vendedor con una sola sucursal', () => {
    mocks.useAuth.mockReturnValue({ sucursalActivaId: 1, usuario: { rol: 'vendedor' } });
    renderizar();

    expect(screen.queryByLabelText('Sucursal')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ingresar lote' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver historial de precios/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver lotes de Paracetamol' })).toBeInTheDocument();
  });

  it('abre las acciones globales de producto y lote', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Nuevo producto' }));
    expect(screen.getByText('Formulario de producto abierto')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Ingresar lote' }));
    expect(screen.getByText('Formulario de lote abierto')).toBeInTheDocument();
  });

  it('crea un lote global, refresca el inventario y cierra el formulario', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Ingresar lote' }));
    await usuario.click(screen.getByRole('button', { name: 'Formulario de lote abierto' }));

    expect(mocks.crearLote).toHaveBeenCalledWith({ numero_lote: 'LT-001' });
    expect(mocks.refrescarInventario).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Formulario de lote abierto' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Lote LT-001 creado correctamente.');
  });

  it('navega al detalle de lotes del producto', async () => {
    const usuario = userEvent.setup();
    const RutaActual = () => <span>{useLocation().pathname}</span>;

    render(
      <MemoryRouter initialEntries={['/inventario']}>
        <Inventario />
        <RutaActual />
      </MemoryRouter>,
    );

    await usuario.click(screen.getByRole('button', { name: 'Ver lotes de Paracetamol' }));
    expect(screen.getByText('/inventario/productos/1/lotes')).toBeInTheDocument();
  });
});
