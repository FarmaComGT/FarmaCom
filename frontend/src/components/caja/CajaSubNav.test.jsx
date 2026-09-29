import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CajaSubNav from './CajaSubNav';

const renderizar = (rol, ruta = '/caja') => render(
  <MemoryRouter initialEntries={[ruta]}>
    <CajaSubNav rol={rol} />
  </MemoryRouter>,
);

describe('CajaSubNav', () => {
  it('muestra operación e historial a un administrador', () => {
    renderizar('administrador');

    expect(screen.getByRole('link', { name: 'Operación' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Historial' })).toBeInTheDocument();
  });

  it('oculta el historial a un dependiente', () => {
    renderizar('dependiente');

    expect(screen.getByRole('link', { name: 'Operación' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Historial' })).not.toBeInTheDocument();
  });
});
