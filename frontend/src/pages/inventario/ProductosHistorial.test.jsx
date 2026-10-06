import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Productos from './Productos';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: mockUseAuth }));
vi.mock('../../hooks/useProductos.js', () => ({
  default: () => ({
    productos: [{
      id_producto: 4,
      codigo: 'MED004-UN',
      nombre_comercial: 'Paracetamol',
      nombre_generico: 'Paracetamol',
      precio_compra: 10,
      stock_minimo: 5,
      activo: true,
      aplica_mayoreo: false,
    }],
    cargando: false,
    error: null,
    crear: vi.fn(),
    actualizar: vi.fn(),
    cambiarEstado: vi.fn(),
  }),
}));
vi.mock('../../hooks/useCategorias.js', () => ({ default: () => ({ categorias: [], cargando: false }) }));
vi.mock('../../hooks/useCasas.js', () => ({ default: () => ({ casas: [], cargando: false }) }));
vi.mock('../../hooks/useProveedores.js', () => ({ default: () => ({ proveedores: [], cargando: false }) }));
vi.mock('../../hooks/usePresentaciones.js', () => ({
  default: () => ({
    presentaciones: [],
    cargando: false,
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  }),
}));
vi.mock('../../components/inventario/productos/ProductoFormModal.jsx', () => ({ default: () => null }));
vi.mock('../../components/inventario/productos/HistorialPrecioProductoModal.jsx', () => ({ default: () => null }));

describe('Productos - acceso al historial de precios', () => {
  const renderizarProductos = () => render(
    <MemoryRouter>
      <Productos />
    </MemoryRouter>,
  );

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ usuario: { rol: 'administrador' } });
  });

  it('muestra la acción a dueño y administrador', () => {
    renderizarProductos();
    expect(screen.getByRole('button', { name: /Ver historial de precios de Paracetamol/ }))
      .toBeInTheDocument();
  });

  it('oculta la acción al dependiente', () => {
    mockUseAuth.mockReturnValue({ usuario: { rol: 'dependiente' } });
    renderizarProductos();
    expect(screen.queryByRole('button', { name: /Ver historial de precios de Paracetamol/ }))
      .not.toBeInTheDocument();
  });
});
