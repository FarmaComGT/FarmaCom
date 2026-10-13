import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Usuarios from './Usuarios.jsx';

const acciones = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  cambiarEstado: vi.fn(),
}));

vi.mock('../hooks/useUsuarios', () => ({
  default: () => ({
    usuarios: [{
      id_usuario: 1,
      nombre_usuario: 'Juan Pérez',
      correo_usuario: 'juan@farmacom.com',
      rol: 'dependiente',
      estado_usuario: 'activo',
      id_sucursal: 1,
    }],
    cargando: false,
    error: null,
    crear: acciones.crear,
    actualizar: acciones.actualizar,
    cambiarEstado: acciones.cambiarEstado,
  }),
}));

vi.mock('../hooks/useSucursales', () => ({
  default: () => ({
    sucursales: [{ id_sucursal: 1, nombre_sucursal: 'Central' }],
    cargando: false,
  }),
}));

vi.mock('../hooks/useLaboratorios', () => ({
  default: () => ({
    laboratorios: [{ id_laboratorio: 1, nombre_laboratorio: 'Laboratorio Central' }],
    cargando: false,
  }),
}));

const renderizar = () => render(
  <MemoryRouter>
    <Usuarios />
  </MemoryRouter>,
);

describe('pantalla de usuarios', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra los usuarios registrados y permite buscarlos', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar por nombre o correo...'), 'no existe');
    expect(screen.getByText('No hay usuarios para mostrar.')).toBeInTheDocument();
  });

  it('crea un usuario nuevo', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_usuario: 2 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    await user.type(screen.getByPlaceholderText('Ej: Juan García'), 'Ana López');
    await user.type(screen.getByPlaceholderText('Ej: juan@farmacom.com'), 'ana@farmacom.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'secreta123');
    await user.selectOptions(screen.getByLabelText('Rol'), 'administrador');
    await user.selectOptions(screen.getByLabelText('Sucursal'), '1');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith({
      nombre_usuario: 'Ana López',
      correo_usuario: 'ana@farmacom.com',
      contrasena: 'secreta123',
      rol: 'administrador',
      id_sucursal: 1,
      id_laboratorio: null,
    }));
  });

  it('muestra el selector de laboratorio solo cuando el rol es laboratorista', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    expect(screen.queryByLabelText('Laboratorio')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Rol'), 'laboratorista');
    expect(screen.getByLabelText('Laboratorio')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Rol'), 'administrador');
    expect(screen.queryByLabelText('Laboratorio')).not.toBeInTheDocument();
  });

  it('crea un laboratorista con laboratorio asignado', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_usuario: 3 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    await user.type(screen.getByPlaceholderText('Ej: Juan García'), 'Labo User');
    await user.type(screen.getByPlaceholderText('Ej: juan@farmacom.com'), 'labo@farmacom.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'secreta123');
    await user.selectOptions(screen.getByLabelText('Rol'), 'laboratorista');
    await user.selectOptions(screen.getByLabelText('Sucursal'), '1');
    await user.selectOptions(screen.getByLabelText('Laboratorio'), '1');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith(expect.objectContaining({
      rol: 'laboratorista',
      id_laboratorio: 1,
    })));
  });

  it('valida el formato del correo electrónico', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    await user.type(screen.getByPlaceholderText('Ej: Juan García'), 'Ana López');
    await user.type(screen.getByPlaceholderText('Ej: juan@farmacom.com'), 'ana@farmacom');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'secreta123');
    await user.selectOptions(screen.getByLabelText('Rol'), 'administrador');
    await user.selectOptions(screen.getByLabelText('Sucursal'), '1');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    expect(screen.getByText('El correo electrónico no tiene un formato válido.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('exige una contraseña de al menos 6 caracteres al crear', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
    await user.type(screen.getByPlaceholderText('Ej: Juan García'), 'Ana López');
    await user.type(screen.getByPlaceholderText('Ej: juan@farmacom.com'), 'ana@farmacom.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), '123');
    await user.selectOptions(screen.getByLabelText('Rol'), 'administrador');
    await user.selectOptions(screen.getByLabelText('Sucursal'), '1');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));

    expect(screen.getByText('La contraseña debe tener al menos 6 caracteres.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('edita un usuario existente sin pedir contraseña', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_usuario: 1 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.queryByPlaceholderText('Mínimo 6 caracteres')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(acciones.actualizar).toHaveBeenCalledWith(1, {
      nombre_usuario: 'Juan Pérez',
      correo_usuario: 'juan@farmacom.com',
      rol: 'dependiente',
      id_sucursal: 1,
      id_laboratorio: null,
    }));
  });

  it('muestra un error cuando falla guardar', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockRejectedValue(new Error('No se pudo guardar'));
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('No se pudo guardar')).toBeInTheDocument();
  });

  it('cambia el estado de un usuario tras confirmar', async () => {
    const user = userEvent.setup();
    acciones.cambiarEstado.mockResolvedValue({});
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(screen.getByText('desactivar usuario')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sí, desactivar' }));

    await waitFor(() => expect(acciones.cambiarEstado).toHaveBeenCalledWith(1, 'inactivo'));
  });

  it('muestra un error cuando falla cambiar el estado', async () => {
    const user = userEvent.setup();
    acciones.cambiarEstado.mockRejectedValue(new Error('No se pudo cambiar'));
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    await user.click(screen.getByRole('button', { name: 'Sí, desactivar' }));

    expect(await screen.findByText('No se pudo cambiar')).toBeInTheDocument();
  });

  it('cancela el cambio de estado', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('desactivar usuario')).not.toBeInTheDocument();
    expect(acciones.cambiarEstado).not.toHaveBeenCalled();
  });
});
