import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Ciudades from './Ciudades.jsx';

const acciones = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
}));

vi.mock('../hooks/useCiudades', () => ({
  default: () => ({
    ciudades: [{ id_ciudad: 1, nombre_ciudad: 'Guatemala' }],
    cargandoCiudades: false,
    errorCiudades: null,
    crear: acciones.crear,
    actualizar: acciones.actualizar,
    eliminar: acciones.eliminar,
  }),
}));

const renderizar = () => render(
  <MemoryRouter>
    <Ciudades />
  </MemoryRouter>,
);

describe('pantalla de ciudades', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra las ciudades registradas y permite buscarlas', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('Guatemala')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar por nombre...'), 'no existe');
    expect(screen.getByText('No hay ciudades para mostrar.')).toBeInTheDocument();
  });

  it('crea una ciudad nueva', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_ciudad: 2 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva ciudad' }));
    await user.type(screen.getByPlaceholderText('Ej: Guatemala'), 'Antigua');
    await user.click(screen.getByRole('button', { name: 'Crear ciudad' }));

    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith({ nombre_ciudad: 'Antigua' }));
  });

  it('no crea una ciudad con un nombre de solo espacios', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva ciudad' }));
    await user.type(screen.getByPlaceholderText('Ej: Guatemala'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear ciudad' }));

    expect(screen.getByText('El nombre de la ciudad es requerido.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('edita una ciudad existente', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_ciudad: 1 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const nombre = screen.getByPlaceholderText('Ej: Guatemala');
    await user.clear(nombre);
    await user.type(nombre, 'Quetzaltenango');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(acciones.actualizar).toHaveBeenCalledWith(1, { nombre_ciudad: 'Quetzaltenango' }));
  });

  it('muestra un error cuando falla la actualización', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockRejectedValue({ response: { data: { mensaje: 'Nombre duplicado' } } });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Nombre duplicado')).toBeInTheDocument();
  });

  it('elimina una ciudad tras confirmar', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockResolvedValue({});
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('Confirmar eliminacion')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Si, eliminar' }));

    await waitFor(() => expect(acciones.eliminar).toHaveBeenCalledWith(1));
  });

  it('muestra un error cuando no se puede eliminar una ciudad', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockRejectedValue({
      response: { data: { mensaje: 'No se puede eliminar una ciudad asociada a sucursales' } },
    });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Si, eliminar' }));

    expect(await screen.findByText('No se puede eliminar una ciudad asociada a sucursales')).toBeInTheDocument();
  });

  it('cancela la eliminación de una ciudad', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Confirmar eliminacion')).not.toBeInTheDocument();
    expect(acciones.eliminar).not.toHaveBeenCalled();
  });

  it('no cierra el modal de creación mientras está guardando', async () => {
    const user = userEvent.setup();
    let resolverCrear;
    acciones.crear.mockReturnValue(new Promise((resolve) => { resolverCrear = resolve; }));
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva ciudad' }));
    await user.type(screen.getByPlaceholderText('Ej: Guatemala'), 'Antigua');
    await user.click(screen.getByRole('button', { name: 'Crear ciudad' }));

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByPlaceholderText('Ej: Guatemala')).toBeInTheDocument();

    resolverCrear({ id_ciudad: 3 });
    await waitFor(() => expect(screen.queryByPlaceholderText('Ej: Guatemala')).not.toBeInTheDocument());
  });
});
