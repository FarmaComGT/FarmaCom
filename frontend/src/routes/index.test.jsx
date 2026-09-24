import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppRoutes from './index';

const estadoAuth = vi.hoisted(() => ({
  usuario: {
    id_usuario: 2,
    nombre_usuario: 'Ana Administradora',
    rol: 'administrador',
  },
}));

vi.mock('../context/AuthContext', () => ({
  AUTH_ACTIONS: { LOGOUT: 'LOGOUT' },
  useAuth: () => ({
    dispatch: vi.fn(),
    isAuthenticated: true,
    status: 'authenticated',
    usuario: estadoAuth.usuario,
  }),
}));

vi.mock('../pages/reportes/Reportes.jsx', () => ({
  default: () => <h2>Resumen de ventas</h2>,
}));

vi.mock('../pages/caja/CajaOperativa.jsx', () => ({
  default: () => <h1>Operación de caja</h1>,
}));

const renderizarRutaReportes = () => render(
  <MemoryRouter initialEntries={['/reports']}>
vi.mock('../pages/reportes/Rentabilidad.jsx', () => ({
  default: () => <h1>Rentabilidad por sucursal</h1>,
}));

const renderizarRutaReportes = (ruta = '/reports') => render(
  <MemoryRouter initialEntries={[ruta]}>
    <AppRoutes />
  </MemoryRouter>,
);

describe('ruta de reportes', () => {
  it('permite abrir directamente la rentabilidad como administrador', async () => {
    renderizarRutaReportes('/reports/rentabilidad');
    expect(await screen.findByRole('heading', { name: 'Rentabilidad por sucursal' })).toBeInTheDocument();
  });

  it('protege la ruta de rentabilidad para dependientes', () => {
    estadoAuth.usuario = { rol: 'dependiente' };
    renderizarRutaReportes('/reports/rentabilidad');
    expect(screen.queryByRole('heading', { name: 'Rentabilidad por sucursal' })).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard (Próximamente)')).toBeInTheDocument();
  });
  beforeEach(() => {
    estadoAuth.usuario = {
      id_usuario: 2,
      nombre_usuario: 'Ana Administradora',
      rol: 'administrador',
    };
    window.localStorage.clear();
  });

  it('permite ingresar a un administrador y muestra el acceso en el menú', async () => {
    renderizarRutaReportes();

    expect(await screen.findByRole('heading', { name: 'Reportes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reportes' })).toBeInTheDocument();
  });

  it('redirige a un dependiente y oculta el acceso del menú', () => {
    estadoAuth.usuario = {
      id_usuario: 7,
      nombre_usuario: 'Diego Dependiente',
      rol: 'dependiente',
    };

    renderizarRutaReportes();

    expect(screen.getByText('Dashboard (Próximamente)')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reportes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Reportes' })).not.toBeInTheDocument();
  });
});

describe('ruta de caja', () => {
  beforeEach(() => {
    estadoAuth.usuario = {
      id_usuario: 7,
      nombre_usuario: 'Diego Dependiente',
      rol: 'dependiente',
    };
    window.localStorage.clear();
  });

  it('permite ingresar a un dependiente y muestra el acceso en el menú', async () => {
    render(
      <MemoryRouter initialEntries={['/caja']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Operación de caja' }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Caja' })).toBeInTheDocument();
  });

  it('oculta la operación de caja para un laboratorista', () => {
    estadoAuth.usuario = {
      id_usuario: 12,
      nombre_usuario: 'Laura Laboratorista',
      rol: 'laboratorista',
    };

    render(
      <MemoryRouter initialEntries={['/caja']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard (Próximamente)')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Caja' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Operación de caja' }))
      .not.toBeInTheDocument();
  });
});
