import { ToastProvider } from '../context/ToastContext.jsx';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render as renderBase, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

const mocks = vi.hoisted(() => ({ rol: 'administrador', logout: vi.fn(), dispatch: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ AUTH_ACTIONS: { LOGOUT: 'LOGOUT' }, useAuth: () => ({ usuario: { rol: mocks.rol }, dispatch: mocks.dispatch }) }));
vi.mock('../api/auth', () => ({ logout: mocks.logout }));

function Ruta() { return <span aria-label="Ruta actual">{useLocation().pathname}</span>; }
function renderizar(ruta = '/inventario') { return render(<MemoryRouter initialEntries={[ruta]}><Sidebar abierta onCerrar={vi.fn()} onNavegar={vi.fn()} /><Ruta /></MemoryRouter>); }

describe('Navegación por tareas de FarmaCom', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.rol = 'administrador'; });
  it.each([
    ['/inventario', 'Existencias'],
    ['/inventario/categorias', 'Categorías'],
    ['/inventario/proveedores', 'Proveedores'],
    ['/inventario/casas', 'Casas farmacéuticas'],
    ['/inventario/promociones', 'Promociones'],
  ])('abre el grupo y marca la sección al entrar directamente a %s', (ruta, nombre) => {
    renderizar(ruta);
    expect(screen.getByRole('button', { name: 'Inventario' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: nombre })).toHaveAttribute('aria-current', 'page');
    expect(document.querySelectorAll('a[aria-current="page"]')).toHaveLength(1);
  });
  it('reabre el grupo al cambiar de ruta con el grupo cerrado', async () => {
    const user = userEvent.setup();
    function CambiarRuta() {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/inventario/proveedores')}>Cambiar sección</button>;
    }
    render(<MemoryRouter initialEntries={['/inventario/categorias']}>
      <Sidebar abierta onCerrar={vi.fn()} onNavegar={vi.fn()} /><CambiarRuta />
    </MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Inventario' }));
    await user.click(screen.getByRole('button', { name: 'Cambiar sección' }));
    expect(screen.getByRole('button', { name: 'Inventario' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Proveedores' })).toHaveAttribute('aria-current', 'page');
  });
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

const render = (ui, options) => renderBase(ui, { wrapper: ToastProvider, ...options });
