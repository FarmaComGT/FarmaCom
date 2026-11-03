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
  refrescar: vi.fn(),
}));

const estadoCategorias = vi.hoisted(() => ({
  categorias: [{ id_categoria: 1, nombre: 'Analgésicos' }],
  cargando: false,
  error: null,
}));

vi.mock('../../hooks/useCategorias', () => ({
  default: () => ({
    ...estadoCategorias,
    refrescar: acciones.refrescar,
    crear: acciones.crear,
    actualizar: acciones.actualizar,
    eliminar: acciones.eliminar,
  }),
}));

const renderizar = (ruta = '/') => render(
  <MemoryRouter initialEntries={[ruta]}>
    <Categorias />
  </MemoryRouter>,
);

describe('pantalla de categorías', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estadoCategorias.categorias = [{ id_categoria: 1, nombre: 'Analgésicos' }];
    estadoCategorias.cargando = false;
    estadoCategorias.error = null;
  });

  it('muestra las categorías registradas y permite buscarlas', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('Analgésicos')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar por nombre…'), 'no existe');
    expect(screen.getByText('Sin coincidencias')).toBeInTheDocument();
  });

  it('restaura y limpia la búsqueda guardada en la URL', async () => {
    const user = userEvent.setup();
    renderizar('/?q=Analgésicos');

    const buscador = screen.getByPlaceholderText('Buscar por nombre…');
    expect(buscador).toHaveValue('Analgésicos');
    expect(screen.getByText('Analgésicos')).toBeInTheDocument();

    await user.clear(buscador);
    expect(buscador).toHaveValue('');
    expect(screen.getByText('Analgésicos')).toBeInTheDocument();
  });

  it('muestra los estados de carga, error y catálogo vacío', async () => {
    const user = userEvent.setup();
    estadoCategorias.categorias = [];
    estadoCategorias.cargando = true;
    const carga = renderizar();
    expect(screen.getByText('Cargando categorías…')).toBeInTheDocument();
    carga.unmount();

    estadoCategorias.cargando = false;
    estadoCategorias.error = 'Servicio no disponible';
    const error = renderizar();
    expect(screen.getByText('No se pudieron cargar las categorías')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(acciones.refrescar).toHaveBeenCalledOnce();
    error.unmount();

    estadoCategorias.error = null;
    renderizar();
    expect(screen.getByText('Aún no hay categorías')).toBeInTheDocument();
  });

  it('crea una categoría nueva', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_categoria: 2 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    await user.type(screen.getByPlaceholderText('Ej.: Analgésicos…'), 'Antibióticos');
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }));

    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith({ nombre: 'Antibióticos' }));
  });

  it('no crea una categoría con un nombre de solo espacios', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    await user.type(screen.getByPlaceholderText('Ej.: Analgésicos…'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }));

    expect(screen.getByText('El nombre es requerido.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('edita una categoría existente', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_categoria: 1 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar categoría Analgésicos' }));
    const nombre = screen.getByPlaceholderText('Ej.: Analgésicos…');
    await user.clear(nombre);
    await user.type(nombre, 'Antiinflamatorios');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(acciones.actualizar).toHaveBeenCalledWith(1, { nombre: 'Antiinflamatorios' }));
  });

  it('muestra un error cuando falla la actualización', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockRejectedValue({ response: { data: { mensaje: 'Nombre duplicado' } } });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar categoría Analgésicos' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Nombre duplicado')).toBeInTheDocument();
  });

  it('protege los cambios sin guardar al cerrar el formulario', async () => {
    const user = userEvent.setup();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    await user.type(screen.getByPlaceholderText('Ej.: Analgésicos…'), 'Nueva');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Nueva categoría' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Nueva categoría' })).not.toBeInTheDocument();
    expect(confirmar).toHaveBeenCalledTimes(2);
    confirmar.mockRestore();
  });

  it('elimina una categoría tras confirmar', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockResolvedValue({});
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar categoría Analgésicos' }));
    expect(screen.getByRole('heading', { name: 'Eliminar categoría' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar categoría' }));

    await waitFor(() => expect(acciones.eliminar).toHaveBeenCalledWith(1));
  });

  it('cancela la eliminación de una categoría', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar categoría Analgésicos' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('heading', { name: 'Eliminar categoría' })).not.toBeInTheDocument();
    expect(acciones.eliminar).not.toHaveBeenCalled();
  });

  it('mantiene abierto el diálogo si falla la eliminación', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockRejectedValue(new Error('Network Error'));
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar categoría Analgésicos' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar categoría' }));

    expect(await screen.findByText('No se pudo eliminar la categoría.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Eliminar categoría' })).toBeInTheDocument();
  });
});
