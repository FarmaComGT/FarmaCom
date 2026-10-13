import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Proveedores from './Proveedores.jsx';

const acciones = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  cambiarEstado: vi.fn(),
}));

vi.mock('../../hooks/useProveedores', () => ({
  default: () => ({
    proveedores: [{ id_proveedor: 1, nombre: 'Distribuidora ABC', activo: true }],
    cargando: false,
    error: null,
    crear: acciones.crear,
    actualizar: acciones.actualizar,
    cambiarEstado: acciones.cambiarEstado,
  }),
}));

const renderizar = () => render(
  <MemoryRouter>
    <Proveedores />
  </MemoryRouter>,
);

describe('pantalla de proveedores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra los proveedores registrados y permite buscarlos', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('Distribuidora ABC')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar por nombre...'), 'no existe');
    expect(screen.getByText('No hay proveedores para mostrar.')).toBeInTheDocument();
  });

  it('crea un proveedor nuevo', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_proveedor: 2 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }));
    await user.type(screen.getByPlaceholderText('Ej: Distribuidora Farmacéutica S.A.'), 'Distribuidora XYZ');
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }));

    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith({ nombre: 'Distribuidora XYZ' }));
  });

  it('no crea un proveedor con un nombre de solo espacios', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }));
    await user.type(screen.getByPlaceholderText('Ej: Distribuidora Farmacéutica S.A.'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }));

    expect(screen.getByText('El nombre es requerido.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('edita un proveedor existente', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_proveedor: 1 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const nombre = screen.getByPlaceholderText('Ej: Distribuidora Farmacéutica S.A.');
    await user.clear(nombre);
    await user.type(nombre, 'Distribuidora Nueva');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(acciones.actualizar).toHaveBeenCalledWith(1, { nombre: 'Distribuidora Nueva' }));
  });

  it('cambia el estado de un proveedor', async () => {
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
});
