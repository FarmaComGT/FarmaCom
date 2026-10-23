import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sucursales from './Sucursales.jsx';

const acciones = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
}));

vi.mock('../hooks/useSucursales', () => ({
  default: () => ({
    sucursales: [{
      id_sucursal: 1,
      nombre_sucursal: 'Central',
      direccion: 'Zona 1',
      id_ciudad: 2,
    }],
    cargando: false,
    error: null,
    crear: acciones.crear,
    actualizar: acciones.actualizar,
    eliminar: acciones.eliminar,
  }),
}));

vi.mock('../hooks/useCiudades', () => ({
  default: () => ({
    ciudades: [{ id_ciudad: 2, nombre_ciudad: 'Guatemala' }],
    cargandoCiudades: false,
    errorCiudades: null,
  }),
}));

const renderizar = () => render(
  <MemoryRouter>
    <Sucursales />
  </MemoryRouter>,
);

describe('pantalla de sucursales', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra las sucursales registradas y permite buscarlas', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('Central')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar por nombre o dirección...'), 'no existe');
    expect(screen.getByText('No hay sucursales para mostrar.')).toBeInTheDocument();
  });

  it('crea una sucursal con nombre, ciudad y dirección', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_sucursal: 2 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva sucursal' }));
    await user.type(screen.getByPlaceholderText('Ej: Farmacia Central Norte'), 'Norte');
    await user.selectOptions(screen.getByRole('combobox'), '2');
    await user.type(screen.getByPlaceholderText('Ej: Calle 10 #45-20'), 'Zona 17');
    await user.click(screen.getByRole('button', { name: 'Crear sucursal' }));

    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith({
      nombre_sucursal: 'Norte',
      direccion: 'Zona 17',
      id_ciudad: 2,
    }));
  });

  it('no crea una sucursal con un nombre mayor a 100 caracteres', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva sucursal' }));
    await user.click(screen.getByPlaceholderText('Ej: Farmacia Central Norte'));
    await user.paste('a'.repeat(101));
    await user.selectOptions(screen.getByRole('combobox'), '2');
    await user.type(screen.getByPlaceholderText('Ej: Calle 10 #45-20'), 'Zona 17');
    await user.click(screen.getByRole('button', { name: 'Crear sucursal' }));

    expect(screen.getByText('El nombre de la sucursal no puede superar los 100 caracteres.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('no crea una sucursal con una dirección mayor a 255 caracteres', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva sucursal' }));
    await user.type(screen.getByPlaceholderText('Ej: Farmacia Central Norte'), 'Norte');
    await user.selectOptions(screen.getByRole('combobox'), '2');
    await user.click(screen.getByPlaceholderText('Ej: Calle 10 #45-20'));
    await user.paste('a'.repeat(256));
    await user.click(screen.getByRole('button', { name: 'Crear sucursal' }));

    expect(screen.getByText('La dirección no puede superar los 255 caracteres.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('edita una sucursal existente', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_sucursal: 1 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const direccion = screen.getByPlaceholderText('Ej: Calle 10 #45-20');
    await user.clear(direccion);
    await user.type(direccion, 'Zona 10');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(acciones.actualizar).toHaveBeenCalledWith(1, {
      nombre_sucursal: 'Central',
      direccion: 'Zona 10',
      id_ciudad: 2,
    }));
  });

  it('muestra un error cuando falla la actualización', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockRejectedValue(new Error('No se pudo'));
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('No se pudo')).toBeInTheDocument();
  });

  it('elimina una sucursal tras confirmar', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockResolvedValue({});
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() => expect(acciones.eliminar).toHaveBeenCalledWith(1));
  });

  it('muestra un error cuando falla la eliminación', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockRejectedValue(new Error('No se puede eliminar'));
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    expect(await screen.findByText('No se puede eliminar')).toBeInTheDocument();
  });
});
