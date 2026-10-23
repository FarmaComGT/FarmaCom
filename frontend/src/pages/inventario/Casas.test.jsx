import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Casas from './Casas.jsx';

const acciones = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  cambiarEstado: vi.fn(),
  eliminar: vi.fn(),
}));

vi.mock('../../hooks/useCasas', () => ({
  default: () => ({
    casas: [{ id_casa: 1, nombre: 'Bayer', activo: true }],
    cargando: false,
    error: null,
    crear: acciones.crear,
    actualizar: acciones.actualizar,
    cambiarEstado: acciones.cambiarEstado,
    eliminar: acciones.eliminar,
  }),
}));

const renderizar = () => render(
  <MemoryRouter>
    <Casas />
  </MemoryRouter>,
);

describe('pantalla de casas farmacéuticas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra las casas registradas y permite buscarlas', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('Bayer')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar casa farmacéutica...'), 'no existe');
    expect(screen.getByText('No hay casas farmacéuticas para mostrar.')).toBeInTheDocument();
  });

  it('crea una casa farmacéutica nueva', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_casa: 2 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva casa farmacéutica' }));
    await user.type(screen.getByPlaceholderText('Ej: Laboratorios Bayer S.A.'), 'Roche');
    await user.click(screen.getByRole('button', { name: 'Crear casa' }));

    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith({ nombre: 'Roche' }));
  });

  it('no crea una casa con un nombre de solo espacios', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva casa farmacéutica' }));
    await user.type(screen.getByPlaceholderText('Ej: Laboratorios Bayer S.A.'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear casa' }));

    expect(screen.getByText('El nombre es requerido.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('edita una casa existente', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_casa: 1 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const nombre = screen.getByPlaceholderText('Ej: Laboratorios Bayer S.A.');
    await user.clear(nombre);
    await user.type(nombre, 'Bayer S.A.');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(acciones.actualizar).toHaveBeenCalledWith(1, { nombre: 'Bayer S.A.' }));
  });

  it('cambia el estado de una casa', async () => {
    const user = userEvent.setup();
    acciones.cambiarEstado.mockResolvedValue({});
    renderizar();

    await user.click(screen.getByRole('button', { name: /Desactivar/ }));

    await waitFor(() => expect(acciones.cambiarEstado).toHaveBeenCalledWith(1, false));
  });

  it('muestra un error cuando falla cambiar el estado', async () => {
    const user = userEvent.setup();
    acciones.cambiarEstado.mockRejectedValue({ response: { data: { mensaje: 'No se pudo' } } });
    renderizar();

    await user.click(screen.getByRole('button', { name: /Desactivar/ }));

    expect(await screen.findByText('No se pudo')).toBeInTheDocument();
  });

  it('elimina una casa tras confirmar', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockResolvedValue({});
    renderizar();

    await user.click(screen.getByTitle('Eliminar'));
    expect(screen.getByText('Eliminar o desactivar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(acciones.eliminar).toHaveBeenCalledWith(1));
  });

  it('cancela la eliminación de una casa', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByTitle('Eliminar'));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Eliminar o desactivar')).not.toBeInTheDocument();
    expect(acciones.eliminar).not.toHaveBeenCalled();
  });
});
