import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MainLayout from './MainLayout.jsx';

vi.mock('../context/AuthContext', () => ({
  AUTH_ACTIONS: { LOGOUT: 'LOGOUT' },
  useAuth: () => ({
    dispatch: vi.fn(),
    usuario: {
      nombre_usuario: 'Ana Administradora',
      rol: 'administrador',
    },
  }),
}));

const establecerAncho = (ancho) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: ancho,
    writable: true,
  });
};

const renderizarLayout = (rutaInicial = '/inventario/productos') =>
  render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route
            path="/inventario/productos"
            element={<div>Contenido del listado de productos</div>}
          />
          <Route path="/dashboard" element={<div>Contenido del dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const obtenerSidebar = () => document.getElementById('sidebar-principal');
const CLAVE_PREFERENCIA_SIDEBAR = 'farmacom:sidebar-abierta';

describe('MainLayout y Sidebar', () => {
  beforeEach(() => {
    establecerAncho(1280);
    document.body.style.overflow = '';
    window.localStorage.clear();
  });

  it('abre y cierra la Sidebar en escritorio sin ocultar el contenido', async () => {
    const user = userEvent.setup();
    renderizarLayout();

    const sidebar = obtenerSidebar();
    const contenido = screen.getByText('Contenido del listado de productos');
    const main = contenido.closest('main');

    expect(sidebar).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('button', { name: 'Cerrar menú lateral' }))
      .toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('button', { name: 'Mostrar menú lateral' }))
      .not.toBeInTheDocument();
    expect(main).toHaveClass('md:ml-64');
    expect(contenido.parentElement).toHaveClass('max-w-7xl');

    await user.click(screen.getByRole('button', { name: 'Cerrar menú lateral' }));

    expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    expect(contenido).toBeVisible();
    expect(main).toHaveClass('md:ml-0');
    expect(contenido.parentElement).toHaveClass('max-w-none');

    const botonAbrir = screen.getByRole('button', { name: 'Mostrar menú lateral' });
    expect(botonAbrir).toHaveAttribute('aria-expanded', 'false');
    await user.click(botonAbrir);

    expect(sidebar).toHaveAttribute('aria-hidden', 'false');
    expect(main).toHaveClass('md:ml-64');
  });

  it('cierra el panel móvil con Escape y restaura el scroll', async () => {
    establecerAncho(390);
    const user = userEvent.setup();
    renderizarLayout();

    const sidebar = obtenerSidebar();
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');

    await user.click(screen.getByRole('button', { name: 'Mostrar menú lateral' }));

    expect(sidebar).toHaveAttribute('aria-hidden', 'false');
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByRole('button', { name: 'Mostrar menú lateral' })).toHaveFocus();
  });

  it('cierra el panel móvil al tocar el fondo o navegar', async () => {
    establecerAncho(390);
    const user = userEvent.setup();
    renderizarLayout();

    const sidebar = obtenerSidebar();
    const abrirSidebar = () => user.click(
      screen.getByRole('button', { name: 'Mostrar menú lateral' }),
    );

    await abrirSidebar();
    const fondo = screen
      .getAllByRole('button', { name: 'Cerrar menú lateral' })
      .find((boton) => boton.classList.contains('inset-0'));

    expect(fondo).toBeDefined();
    await user.click(fondo);
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');

    await abrirSidebar();
    await user.click(screen.getByRole('link', { name: 'Dashboard' }));

    expect(screen.getByText('Contenido del dashboard')).toBeVisible();
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  });

  it('restablece la Sidebar al cruzar el punto de quiebre responsive', () => {
    renderizarLayout();
    const sidebar = obtenerSidebar();

    expect(sidebar).toHaveAttribute('aria-hidden', 'false');

    establecerAncho(390);
    fireEvent(window, new Event('resize'));
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');

    establecerAncho(1024);
    fireEvent(window, new Event('resize'));
    expect(sidebar).toHaveAttribute('aria-hidden', 'false');
  });

  it('recuerda en escritorio si el usuario dejó cerrada la Sidebar', async () => {
    window.localStorage.setItem(CLAVE_PREFERENCIA_SIDEBAR, 'false');
    const user = userEvent.setup();
    renderizarLayout();

    const sidebar = obtenerSidebar();
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');

    await user.click(screen.getByRole('button', { name: 'Mostrar menú lateral' }));
    expect(window.localStorage.getItem(CLAVE_PREFERENCIA_SIDEBAR)).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Cerrar menú lateral' }));
    expect(window.localStorage.getItem(CLAVE_PREFERENCIA_SIDEBAR)).toBe('false');
  });

  it('inicia cerrada en móvil sin sobrescribir la preferencia de escritorio', () => {
    window.localStorage.setItem(CLAVE_PREFERENCIA_SIDEBAR, 'true');
    establecerAncho(390);

    renderizarLayout();

    expect(obtenerSidebar()).toHaveAttribute('aria-hidden', 'true');
    expect(window.localStorage.getItem(CLAVE_PREFERENCIA_SIDEBAR)).toBe('true');
  });
});
