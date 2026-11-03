import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InventarioSubNav from './InventarioSubNav';

const renderizar = (ruta = '/inventario') => render(
  <MemoryRouter initialEntries={[ruta]}>
    <InventarioSubNav />
  </MemoryRouter>,
);

describe('InventarioSubNav', () => {
  beforeEach(() => {
    delete document.startViewTransition;
  });

  it('incluye el acceso a promociones', () => {
    renderizar();

    expect(screen.getByRole('link', { name: 'Promociones' }))
      .toHaveAttribute('href', '/inventario/promociones');
  });

  it('marca promociones como la sección activa', () => {
    renderizar('/inventario/promociones');

    expect(screen.getByRole('link', { name: 'Promociones' }))
      .toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Inventario' }))
      .not.toHaveAttribute('aria-current', 'page');
  });
  it('usa la misma transición de vista al cambiar de sección', async () => {
    const user = userEvent.setup();
    const iniciarTransicion = vi.fn((actualizar) => {
      actualizar();
      return { finished: Promise.resolve() };
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: iniciarTransicion,
    });
    renderizar('/inventario/categorias');

    await user.click(screen.getByRole('link', { name: 'Proveedores' }));

    expect(iniciarTransicion).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Proveedores' }))
      .toHaveAttribute('aria-current', 'page');
  });
});
