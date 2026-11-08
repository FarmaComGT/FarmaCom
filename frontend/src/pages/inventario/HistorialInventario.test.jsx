import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import HistorialInventario from './HistorialInventario.jsx';

const mocks = vi.hoisted(() => ({ obtener: vi.fn() }));

vi.mock('../../api/historialInventario', () => ({
  obtenerHistorialInventario: mocks.obtener,
}));
vi.mock('../../hooks/useProductos.js', () => ({
  default: () => ({ productos: [{ id_producto: 4, nombre_comercial: 'Paracetamol' }] }),
}));
vi.mock('../../hooks/useSucursales.js', () => ({
  default: () => ({ sucursales: [{ id_sucursal: 3, nombre_sucursal: 'Central' }] }),
}));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ usuario: { rol: 'administrador' } }),
}));

describe('HistorialInventario', () => {
  beforeEach(() => {
    mocks.obtener.mockReset();
    mocks.obtener.mockResolvedValue({
      datos: [{
        id_evento: 'auditoria-1', fecha: '2026-11-07T15:00:00Z',
        tipo_cambio: 'modificacion', entidad: 'lote', nombre_producto: 'Paracetamol',
        numero_lote: 'LT-1', nombre_sucursal: 'Central', nombre_usuario: 'Ana',
        valores_anteriores: { precio_venta: 10 },
        valores_nuevos: { precio_venta: 12 },
      }],
      paginacion: { pagina: 1, limite: 25, total: 1, total_paginas: 1 },
    });
  });

  it('muestra el cambio y aplica filtros paginados desde la URL', async () => {
    const usuario = userEvent.setup();
    render(<MemoryRouter><HistorialInventario /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Historial de inventario' })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: /Paracetamol/ })).toBeInTheDocument();
    await usuario.click(screen.getByText('Ver cambios…'));
    expect(screen.getByText(/Q\s*10\.00 → Q\s*12\.00/)).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Producto'), '4');
    await usuario.type(screen.getByLabelText('Lote'), 'LT-1');
    await usuario.click(screen.getByRole('button', { name: /Aplicar filtros/ }));

    await waitFor(() => expect(mocks.obtener).toHaveBeenLastCalledWith({
      id_producto: '4', lote: 'LT-1', pagina: 1, limite: 25,
    }));
  });
});
