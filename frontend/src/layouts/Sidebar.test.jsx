import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

const mocks = vi.hoisted(() => ({ rol: 'administrador', logout: vi.fn(), dispatch: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ AUTH_ACTIONS: { LOGOUT: 'LOGOUT' }, useAuth: () => ({ usuario: { rol: mocks.rol }, dispatch: mocks.dispatch }) }));
vi.mock('../api/auth', () => ({ logout: mocks.logout }));

function Ruta() { return <span aria-label="Ruta actual">{useLocation().pathname}</span>; }
function renderizar() { return render(<MemoryRouter initialEntries={['/inventario']}><Sidebar abierta onCerrar={vi.fn()} onNavegar={vi.fn()} /><Ruta /></MemoryRouter>); }

describe('Navegación por tareas de FarmaCom', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.rol = 'administrador'; });
  it('identifica la farmacia y conserva la ruta de existencias y los catálogos', async () => {
    const user = userEvent.setup();
    renderizar();
    expect(screen.getByText('Farmacia San Gabriel')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Existencias' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Casas farmacéuticas' })).toHaveAttribute('href', '/inventario/casas');
    const grupo = screen.getByRole('button', { name: 'Inventario' });
    await user.click(grupo);
    expect(grupo).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Existencias' })).not.toBeInTheDocument();
    await user.click(grupo);
    expect(screen.getByRole('link', { name: 'Existencias' })).toBeVisible();
  });
  it('mantiene los módulos autorizados para dependientes', () => {
    mocks.rol = 'dependiente'; renderizar();
    expect(screen.getByRole('link', { name: 'Punto de venta' })).toHaveAttribute('href', '/pos');
    expect(screen.getByRole('link', { name: 'Clientes' })).toBeVisible();
    for (const name of ['Promociones', 'Reportes', 'Usuarios']) expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ubicaciones' })).not.toBeInTheDocument();
  });
  it('limita el laboratorio a sus destinos autorizados', () => {
    mocks.rol = 'laboratorista'; renderizar();
    expect(screen.getByRole('link', { name: 'Laboratorio' })).toHaveAttribute('href', '/laboratorio/pacientes');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inventario' })).not.toBeInTheDocument();
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });
  it('permite reintentar un cierre fallido y navega al login al cerrar sesión', async () => {
    const user = userEvent.setup();
    mocks.logout.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce({});
    renderizar();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo cerrar sesión');
    expect(mocks.dispatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'LOGOUT' });
    expect(screen.getByLabelText('Ruta actual')).toHaveTextContent('/login');
  });
});
