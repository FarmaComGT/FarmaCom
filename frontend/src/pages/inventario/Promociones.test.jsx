import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Promociones from './Promociones';

const mocks = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  cambiarEstado: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ sucursalActivaId: 1, usuario: { rol: 'administrador' } }),
}));

vi.mock('../../hooks/useProductos', () => ({
  default: () => ({
    productos: [{
      id_producto: 4,
      codigo: 'MED-004',
      nombre_comercial: 'Paracetamol',
      nombre_generico: 'Acetaminofén',
    }],
    cargando: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useSucursales', () => ({
  default: () => ({
    sucursales: [{ id_sucursal: 1, nombre_sucursal: 'Sucursal Centro' }],
    cargando: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useLotesProducto', () => ({
  default: () => ({
    lotes: [{
      id_lote: 1,
      id_sucursal: 1,
      stock_actual: 10,
      precio_venta: 10,
      estado_vencimiento: 'normal',
    }],
    cargando: false,
    error: null,
  }),
}));

vi.mock('../../hooks/usePromociones', () => ({
  default: () => ({
    promociones: [{
      id_promocion: 8,
      id_sucursal: 1,
      nombre_sucursal: 'Sucursal Centro',
      cantidad_minima: 3,
      precio_promocion: 7.5,
      fecha_inicio: '2026-10-01',
      fecha_fin: '2026-12-31',
      activo: true,
    }],
    cargando: false,
    error: null,
    crear: mocks.crear,
    actualizar: mocks.actualizar,
    cambiarEstado: mocks.cambiarEstado,
  }),
}));

const renderizar = () => render(
  <MemoryRouter>
    <Promociones />
  </MemoryRouter>,
);

describe('pantalla de promociones', () => {
  beforeEach(() => vi.clearAllMocks());

  it('crea una promoción para el producto y sucursal seleccionados', async () => {
    const user = userEvent.setup();
    renderizar();

    const botonNueva = screen.getByRole('button', { name: 'Nueva promoción' });
    await waitFor(() => expect(botonNueva).toBeEnabled());
    await user.click(botonNueva);
    await user.clear(screen.getByLabelText('Cantidad mínima'));
    await user.type(screen.getByLabelText('Cantidad mínima'), '5');
    await user.type(screen.getByLabelText('Precio promocional (Q)'), '6.25');
    await user.type(screen.getByLabelText('Fecha de inicio'), '2026-11-01');
    await user.type(screen.getByLabelText('Fecha de finalización'), '2026-11-30');
    await user.click(screen.getByRole('button', { name: 'Crear promoción' }));

    expect(mocks.crear).toHaveBeenCalledWith({
      id_sucursal: 1,
      cantidad_minima: 5,
      precio_promocion: 6.25,
      fecha_inicio: '2026-11-01',
      fecha_fin: '2026-11-30',
    });
  });

  it('permite desactivar una promoción vigente', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Desactivar promoción 8' }));

    expect(mocks.cambiarEstado).toHaveBeenCalledWith(8, false);
  });

  it('limita el precio promocional por debajo del menor precio normal disponible', async () => {
    const user = userEvent.setup();
    renderizar();

    const botonNueva = screen.getByRole('button', { name: 'Nueva promoción' });
    await waitFor(() => expect(botonNueva).toBeEnabled());
    await user.click(botonNueva);
    const precio = screen.getByLabelText('Precio promocional (Q)');
    await user.type(precio, '10');
    await user.type(screen.getByLabelText('Fecha de inicio'), '2026-11-01');
    await user.type(screen.getByLabelText('Fecha de finalización'), '2026-11-30');
    await user.click(screen.getByRole('button', { name: 'Crear promoción' }));

    expect(precio).toHaveAttribute('max', '9.99');
    expect(precio).toBeInvalid();
    expect(mocks.crear).not.toHaveBeenCalled();
  });
});
