import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Paginacion from './Paginacion.jsx';

const props = { paginacion: { pagina: 2, limite: 25, total: 51, total_paginas: 3 },
  crearDestino: (pagina) => `/inventario?estado_stock=agotado&pagina=${pagina}`, onLimiteChange: vi.fn() };
const mostrar = (extra = {}) => render(<MemoryRouter><Paginacion {...props} {...extra} /></MemoryRouter>);
describe('Paginacion', () => {
  it('muestra la página actual y enlaces que conservan filtros', () => {
    mostrar();
    expect(screen.getByText('pág 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('href', '/inventario?estado_stock=agotado&pagina=1');
    expect(screen.getByRole('link', { name: 'Siguiente' })).toHaveAttribute('href', '/inventario?estado_stock=agotado&pagina=3');
  });
  it('conserva los controles sin resultados', () => {
    mostrar({ paginacion: { pagina: 1, limite: 25, total: 0, total_paginas: 1 } });
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('link', { name: 'Siguiente' })).toHaveAttribute('aria-disabled', 'true');
  });
  it('cambia el tamaño y bloquea navegación durante la carga', async () => {
    const usuario = userEvent.setup();
    const { rerender } = mostrar();
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Por página' }), '50');
    expect(props.onLimiteChange).toHaveBeenCalledWith(50);
    rerender(<MemoryRouter><Paginacion {...props} cargando /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('link', { name: 'Siguiente' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
