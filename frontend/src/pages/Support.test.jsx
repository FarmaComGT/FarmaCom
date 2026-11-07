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
    expect(screen.getByText('8 resultados')).toBeInTheDocument();
    expect(screen.getByText('Registrar una venta')).toBeInTheDocument();
    expect(screen.getByText('Consultar inventario por sucursal')).toBeInTheDocument();
    expect(screen.queryByText('Anular una venta')).not.toBeInTheDocument();
    expect(screen.getByText('Necesito corregir una venta cobrada')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ir al Historial de ventas' })).not.toBeInTheDocument();
    expect(screen.getByText('No puedo iniciar sesión')).toBeInTheDocument();
    expect(screen.queryByText('Administrar usuarios con seguridad')).not.toBeInTheDocument();
    expect(screen.queryByText('Gestionar un expediente de laboratorio')).not.toBeInTheDocument();
  });

  it('normaliza la búsqueda, muestra un único resultado y permite limpiarla', async () => {
    const user = userEvent.setup();
    renderizar('/ayuda?q=contrasena');

    const buscador = screen.getByRole('searchbox', { name: 'Buscar en la ayuda' });
    expect(buscador).toHaveValue('contrasena');
    expect(screen.getByText('1 resultado')).toBeInTheDocument();
    expect(screen.getByText('No puedo iniciar sesión')).toBeInTheDocument();

    await user.clear(buscador);

    expect(screen.getByText('8 resultados')).toBeInTheDocument();
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

    expect(screen.getByText('11 resultados')).toBeInTheDocument();
    expect(screen.getByText('Ingresar o corregir un lote')).toBeInTheDocument();
    expect(screen.getByText('Administrar usuarios con seguridad')).toBeInTheDocument();
    expect(screen.getByText('Gestionar un expediente de laboratorio')).toBeInTheDocument();
  });

  it('abre una guía desde la URL y permite cerrarla y abrirla con el teclado', async () => {
    const user = userEvent.setup();
    renderizar('/support?tema=abrir-caja');
    const resumen = screen.getByText('Abrir un turno de caja');
    expect(resumen.closest('details')).toHaveAttribute('open');
    expect(screen.getByRole('link', { name: 'Ir a Caja' })).toHaveAttribute('href', '/caja');
    resumen.focus();
    await user.keyboard('{Enter}');
    expect(resumen.closest('details')).not.toHaveAttribute('open');
    await user.keyboard(' ');
    expect(resumen.closest('details')).toHaveAttribute('open');
  });

  it('busca en las instrucciones y recupera el listado con el botón de limpieza', async () => {
    const user = userEvent.setup();
    renderizar('/support?q=efectivo%20fisico&tema=cerrar-caja');
    expect(screen.getByText('1 resultado')).toBeInTheDocument();
    expect(screen.getByText('Cerrar un turno de caja').closest('details')).toHaveAttribute('open');
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(screen.getByText('8 resultados')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('muestra al laboratorista solo sus guías y destinos permitidos', () => {
    mocks.useAuth.mockReturnValue({ usuario: { rol: 'laboratorista' } });
    renderizar('/support?tema=laboratorio');
    expect(screen.getByText('2 resultados')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buscar un paciente' })).toHaveAttribute('href', '/laboratorio/pacientes');
    expect(screen.queryByText('Registrar una venta')).not.toBeInTheDocument();
  });
});
