import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Support from './Support.jsx';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: mocks.useAuth }));

const renderizar = (ruta = '/ayuda') => render(
  <MemoryRouter initialEntries={[ruta]}>
    <Support />
  </MemoryRouter>,
);

describe('Support', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({ usuario: { rol: 'dependiente' } });
  });

  it('muestra únicamente los temas disponibles para el rol autenticado', () => {
    renderizar();

    expect(document.title).toBe('Ayuda · FarmaCom');
    expect(screen.getByText('4 resultados')).toBeInTheDocument();
    expect(screen.getByText('Registrar una venta')).toBeInTheDocument();
    expect(screen.getByText('Consultar inventario por sucursal')).toBeInTheDocument();
    expect(screen.getByText('Anular una venta')).toBeInTheDocument();
    expect(screen.getByText('No puedo iniciar sesión')).toBeInTheDocument();
    expect(screen.queryByText('Administrar usuarios con seguridad')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestionar un expediente de laboratorio')).not.toBeInTheDocument();
  });

  it('normaliza la búsqueda, muestra un único resultado y permite limpiarla', async () => {
    const user = userEvent.setup();
    renderizar('/ayuda?q=sesion');

    const buscador = screen.getByRole('searchbox', { name: 'Buscar en la ayuda' });
    expect(buscador).toHaveValue('sesion');
    expect(screen.getByText('1 resultado')).toBeInTheDocument();
    expect(screen.getByText('No puedo iniciar sesión')).toBeInTheDocument();

    await user.clear(buscador);

    expect(screen.getByText('4 resultados')).toBeInTheDocument();
    expect(screen.getByText('Registrar una venta')).toBeInTheDocument();
  });

  it('presenta una recuperación útil cuando la consulta no tiene coincidencias', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar en la ayuda' }), 'tema inexistente');

    expect(screen.getByText('0 resultados')).toBeInTheDocument();
    expect(screen.getByText('No encontramos ese tema.')).toBeInTheDocument();
    expect(screen.queryByText('Registrar una venta')).not.toBeInTheDocument();
  });

  it('incluye las guías administrativas para el dueño', () => {
    mocks.useAuth.mockReturnValue({ usuario: { rol: 'dueno' } });
    renderizar();

    expect(screen.getByText('7 resultados')).toBeInTheDocument();
    expect(screen.getByText('Ingresar o corregir un lote')).toBeInTheDocument();
    expect(screen.getByText('Administrar usuarios con seguridad')).toBeInTheDocument();
    expect(screen.getByText('Gestionar un expediente de laboratorio')).toBeInTheDocument();
  });
});
