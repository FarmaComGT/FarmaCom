import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PromocionesTable from './PromocionesTable';

const promocion = {
  id_promocion: 7,
  nombre_sucursal: 'Sucursal Centro',
  cantidad_minima: 3,
  precio_promocion: 12,
  fecha_inicio: '2026-10-01',
  fecha_fin: '2026-12-31',
  activo: true,
};

describe('PromocionesTable', () => {
  it('muestra precio, condición, vigencia y estado', () => {
    render(<PromocionesTable
      promociones={[promocion]}
      cargando={false}
      productoSeleccionado
      hayFiltroSucursal={false}
      cambiandoId={null}
      onEditar={vi.fn()}
      onCambiarEstado={vi.fn()}
    />);

    expect(screen.getByText('Sucursal Centro')).toBeInTheDocument();
    expect(screen.getByText('Desde 3 unidades por venta')).toBeInTheDocument();
    expect(screen.getByText(/12\.00/)).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
  });

  it('permite solicitar la desactivación', async () => {
    const onCambiarEstado = vi.fn();
    const user = userEvent.setup();
    render(<PromocionesTable
      promociones={[promocion]}
      cargando={false}
      productoSeleccionado
      hayFiltroSucursal={false}
      cambiandoId={null}
      onEditar={vi.fn()}
      onCambiarEstado={onCambiarEstado}
    />);

    await user.click(screen.getByRole('button', { name: /Más acciones para Producto/ }));
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(onCambiarEstado).toHaveBeenCalledWith(promocion);
  });

  it('explica que se debe seleccionar un producto', () => {
    render(<PromocionesTable promociones={[]} cargando={false} productoSeleccionado={false} hayFiltroSucursal={false} onEditar={vi.fn()} onCambiarEstado={vi.fn()} />);
    expect(screen.getByText('No hay promociones que coincidan')).toBeInTheDocument();
  });

  it('muestra carga, error recuperable y vacío filtrado', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<PromocionesTable promociones={[]} cargando productoSeleccionado hayFiltroSucursal={false} onRetry={onRetry} onEditar={vi.fn()} onCambiarEstado={vi.fn()} />);
    expect(screen.getByText('Cargando promociones…')).toBeInTheDocument();

    rerender(<PromocionesTable promociones={[]} cargando={false} error="Servicio no disponible" productoSeleccionado hayFiltroSucursal={false} onRetry={onRetry} onEditar={vi.fn()} onCambiarEstado={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<PromocionesTable promociones={[]} cargando={false} productoSeleccionado hayFiltroSucursal onRetry={onRetry} onEditar={vi.fn()} onCambiarEstado={vi.fn()} />);
    expect(screen.getByText('No hay promociones que coincidan')).toBeInTheDocument();
  });
});
