import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import InventarioSubNav from './InventarioSubNav';

const renderizar = (ruta = '/inventario') => render(
  <MemoryRouter initialEntries={[ruta]}>
    <InventarioSubNav />
  </MemoryRouter>,
);

describe('InventarioSubNav', () => {
  it('incluye el acceso a promociones', () => {
    renderizar();

    expect(screen.getByRole('link', { name: 'Promociones' }))
      .toHaveAttribute('href', '/inventario/promociones');
  });

  it('marca promociones como la sección activa', () => {
    renderizar('/inventario/promociones');

    expect(screen.getByRole('link', { name: 'Promociones' }))
      .toHaveClass('bg-white', 'text-primary');
    expect(screen.getByRole('link', { name: 'Inventario' }))
      .not.toHaveClass('bg-white');
  });
});
