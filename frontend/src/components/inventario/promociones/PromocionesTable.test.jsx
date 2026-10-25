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
      cambiandoId={null}
      onEditar={vi.fn()}
      onCambiarEstado={vi.fn()}
    />);

    expect(screen.getByText('Sucursal Centro')).toBeInTheDocument();
    expect(screen.getByText('Desde 3 unidades')).toBeInTheDocument();
    expect(screen.getByText(/12\.00/)).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
  });

  it('permite solicitar la desactivación', async () => {
    const onCambiarEstado = vi.fn();
    const user = userEvent.setup();
    render(<PromocionesTable
      promociones={[promocion]}
      cargando={false}
      cambiandoId={null}
      onEditar={vi.fn()}
      onCambiarEstado={onCambiarEstado}
    />);

    await user.click(screen.getByRole('button', { name: 'Desactivar promoción 7' }));
    expect(onCambiarEstado).toHaveBeenCalledWith(promocion);
  });
});
