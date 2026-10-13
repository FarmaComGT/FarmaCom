import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Categorias from './Categorias.jsx';

const acciones = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
}));

vi.mock('../../hooks/useCategorias', () => ({
  default: () => ({
    categorias: [{ id_categoria: 1, nombre: 'Analgésicos' }],
    cargando: false,
    error: null,
    crear: acciones.crear,
    actualizar: acciones.actualizar,
    eliminar: acciones.eliminar,
  }),
}));

const renderizar = () => render(
  <MemoryRouter>
    <Categorias />
  </MemoryRouter>,
);

describe('pantalla de categorías', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra las categorías registradas y permite buscarlas', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('Analgésicos')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar por nombre...'), 'no existe');
    expect(screen.getByText('No hay categorías para mostrar.')).toBeInTheDocument();
  });

  it('crea una categoría nueva', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_categoria: 2 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    await user.type(screen.getByPlaceholderText('Ej: Analgésico'), 'Antibióticos');
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }));

    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith({ nombre: 'Antibióticos' }));
  });

  it('no crea una categoría con un nombre de solo espacios', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    await user.type(screen.getByPlaceholderText('Ej: Analgésico'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }));

    expect(screen.getByText('El nombre es requerido.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('edita una categoría existente', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_categoria: 1 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const nombre = screen.getByPlaceholderText('Ej: Analgésico');
    await user.clear(nombre);
    await user.type(nombre, 'Antiinflamatorios');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(acciones.actualizar).toHaveBeenCalledWith(1, { nombre: 'Antiinflamatorios' }));
  });

  it('muestra un error cuando falla la actualización', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockRejectedValue({ response: { data: { mensaje: 'Nombre duplicado' } } });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Nombre duplicado')).toBeInTheDocument();
  });

  it('elimina una categoría tras confirmar', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockResolvedValue({});
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() => expect(acciones.eliminar).toHaveBeenCalledWith(1));
  });

  it('cancela la eliminación de una categoría', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Confirmar eliminación')).not.toBeInTheDocument();
    expect(acciones.eliminar).not.toHaveBeenCalled();
  });
});
