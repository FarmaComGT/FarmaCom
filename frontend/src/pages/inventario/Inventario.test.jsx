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
  default: () => ({
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
    sucursales: [{ id_sucursal: 1, nombre_sucursal: 'Central' }],
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
  default: ({ isOpen }) => isOpen ? <div>Formulario de lote abierto</div> : null,
}));
vi.mock('../../components/inventario/productos/HistorialPrecioProductoModal.jsx', () => ({
  default: () => null,
}));

describe('Inventario unificado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({
      sucursalActivaId: 1,
      usuario: { rol: 'administrador' },
    });
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

  it('abre las acciones globales de producto y lote', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Nuevo producto' }));
    expect(screen.getByText('Formulario de producto abierto')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Ingresar lote' }));
    expect(screen.getByText('Formulario de lote abierto')).toBeInTheDocument();
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
