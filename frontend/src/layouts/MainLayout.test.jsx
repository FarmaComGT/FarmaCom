import { ToastProvider } from '../context/ToastContext.jsx';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render as renderBase, screen } from '@testing-library/react';
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
          <Route path="/caja" element={<div>Contenido de caja</div>} />
          <Route path="/usuarios" element={<div>Contenido de usuarios</div>} />
          <Route path="/inventario/categorias" element={<div>Contenido de categorías</div>} />
          <Route path="/inventario/proveedores" element={<div>Contenido de proveedores</div>} />
          <Route path="/inventario/casas" element={<div>Contenido de casas farmacéuticas</div>} />
          <Route path="/inventario/promociones" element={<div>Contenido de promociones</div>} />
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
    delete document.startViewTransition;
  });

  it('anima la navegación iniciada desde la barra lateral', async () => {
    const user = userEvent.setup();
    const iniciarTransicion = vi.fn((actualizar) => {
      actualizar();
      return { finished: Promise.resolve() };
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: iniciarTransicion,
    });
    renderizarLayout('/dashboard');

    await user.click(screen.getByRole('link', { name: 'Usuarios' }));

    expect(iniciarTransicion).toHaveBeenCalledOnce();
    expect(screen.getByText('Contenido de usuarios')).toBeVisible();
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

  it.each([
    ['/inventario/categorias', 'Contenido de categorías'],
    ['/inventario/proveedores', 'Contenido de proveedores'],
    ['/inventario/casas', 'Contenido de casas farmacéuticas'],
    ['/inventario/promociones', 'Contenido de promociones'],
  ])('mantiene el mismo contenedor en %s', (ruta, contenidoEsperado) => {
    renderizarLayout(ruta);

    expect(screen.getByText(contenidoEsperado).parentElement)
      .toHaveClass('management-content');
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

  it.each([390, 768, 1024])('mantiene orientación y foco en el menú superpuesto a %s px', async (ancho) => {
    establecerAncho(ancho);
    const user = userEvent.setup();
    renderizarLayout('/inventario/casas');
    const ubicacion = screen.getByRole('navigation', { name: 'Ubicación actual' });
    expect(ubicacion).toHaveTextContent('Casas farmacéuticas');
    await user.click(screen.getByRole('button', { name: 'Mostrar menú lateral' }));
    expect(screen.getByRole('dialog', { name: 'Navegación principal' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('link', { name: 'Casas farmacéuticas' })).toHaveFocus();
    expect(document.getElementById('contenido-principal').inert).toBe(true);

    const cerrar = screen.getAllByRole('button', { name: 'Cerrar menú lateral' })
      .find(boton => boton.classList.contains('shell-close-sidebar'));
    cerrar.focus();
    fireEvent.keyDown(cerrar, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(cerrar).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Inventario' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Mostrar menú lateral' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Mostrar menú lateral' }));
    expect(screen.getByRole('link', { name: 'Categorías' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Categorías' }));
    expect(obtenerSidebar()).toHaveAttribute('aria-hidden', 'true');
    expect(document.getElementById('contenido-principal').inert).toBe(false);
    expect(ubicacion).toHaveTextContent('Categorías');
    expect(screen.getByRole('button', { name: 'Mostrar menú lateral' })).toHaveFocus();
  });

  it('conserva abierto el menú con Ctrl+clic en un enlace', async () => {
    establecerAncho(390);
    const user = userEvent.setup();
    renderizarLayout('/inventario/casas');
    await user.click(screen.getByRole('button', { name: 'Mostrar menú lateral' }));
    fireEvent.click(screen.getByRole('link', { name: 'Categorías' }), { ctrlKey: true });
    expect(obtenerSidebar()).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByText('Contenido de casas farmacéuticas')).toBeInTheDocument();
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
    await user.click(screen.getByRole('link', { name: 'Inicio' }));

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

  it('restaura el menú al pasar de caja a una pantalla con otro punto de quiebre', async () => {
    establecerAncho(1024);
    const user = userEvent.setup();
    renderizarLayout('/caja');

    expect(obtenerSidebar()).toHaveAttribute('aria-hidden', 'true');
    await user.click(screen.getByRole('button', { name: 'Mostrar menú lateral' }));
    await user.click(screen.getByRole('link', { name: 'Inicio' }));

    expect(screen.getByText('Contenido del dashboard')).toBeVisible();
    expect(obtenerSidebar()).toHaveAttribute('aria-hidden', 'false');
    expect(window.localStorage.getItem(CLAVE_PREFERENCIA_SIDEBAR)).toBe('true');
  });
});

const render = (ui, options) => renderBase(ui, { wrapper: ToastProvider, ...options });
