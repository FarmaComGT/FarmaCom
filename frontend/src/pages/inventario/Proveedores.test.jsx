import { ToastProvider } from '../../context/ToastContext.jsx';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Proveedores from './Proveedores.jsx';
import { elegirAccion } from '../../test/menuAcciones';

const acciones = vi.hoisted(() => ({ crear: vi.fn(), actualizar: vi.fn(), cambiarEstado: vi.fn(), eliminar: vi.fn(), refrescar: vi.fn() }));
const estadoProveedores = vi.hoisted(() => ({ proveedores: [{ id_proveedor: 1, nombre: 'Distribuidora ABC', activo: true }], cargando: false, error: null }));

vi.mock('../../hooks/useProveedores', () => ({
  default: () => ({ ...estadoProveedores, ...acciones }),
}));

const renderizar = (ruta = '/') => render(<ToastProvider><MemoryRouter initialEntries={[ruta]}><Proveedores /></MemoryRouter></ToastProvider>);

describe('pantalla de proveedores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estadoProveedores.proveedores = [{ id_proveedor: 1, nombre: 'Distribuidora ABC', activo: true }];
    estadoProveedores.cargando = false;
    estadoProveedores.error = null;
  });

  it('muestra los proveedores registrados y permite buscarlos', async () => {
    const user = userEvent.setup();
    renderizar();
    expect(screen.getByText('Distribuidora ABC')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Buscar proveedor…'), 'no existe');
    expect(screen.getByText('Sin coincidencias')).toBeInTheDocument();
  });

  it('filtra proveedores activos e inactivos desde la URL', async () => {
    const user = userEvent.setup();
    estadoProveedores.proveedores = [
      { id_proveedor: 1, nombre: 'Distribuidora ABC', activo: true },
      { id_proveedor: 2, nombre: 'Distribuidora Norte', activo: false },
    ];
    renderizar('/?estado=inactivo');
    expect(screen.queryByText('Distribuidora ABC')).not.toBeInTheDocument();
    expect(screen.getByText('Distribuidora Norte')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Activos/ }));
    expect(screen.getByText('Distribuidora ABC')).toBeInTheDocument();
    expect(screen.queryByText('Distribuidora Norte')).not.toBeInTheDocument();
  });

  it('muestra los estados de carga, error y catálogo vacío', async () => {
    const user = userEvent.setup();
    estadoProveedores.proveedores = [];
    estadoProveedores.cargando = true;
    const carga = renderizar();
    expect(screen.getByText('Cargando proveedores…')).toBeInTheDocument();
    carga.unmount();
    estadoProveedores.cargando = false;
    estadoProveedores.error = 'Servicio no disponible';
    const error = renderizar();
    expect(screen.getByText('No se pudieron cargar los proveedores')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(acciones.refrescar).toHaveBeenCalledOnce();
    error.unmount();
    estadoProveedores.error = null;
    renderizar();
    expect(screen.getByText('Aún no hay proveedores')).toBeInTheDocument();
  });

  it('crea un proveedor nuevo', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_proveedor: 2 });
    renderizar();
    await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }));
    await user.type(screen.getByPlaceholderText('Ej.: Distribuidora Farmacéutica S. A.…'), 'Distribuidora XYZ');
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }));
    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith({ nombre: 'Distribuidora XYZ' }));
  });

  it('no crea un proveedor con un nombre de solo espacios', async () => {
    const user = userEvent.setup();
    renderizar();
    await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }));
    await user.type(screen.getByPlaceholderText('Ej.: Distribuidora Farmacéutica S. A.…'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear proveedor' }));
    expect(screen.getByText('El nombre es requerido.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('edita un proveedor existente', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_proveedor: 1 });
    renderizar();
    await elegirAccion(user, 'Distribuidora ABC', 'Editar');
    const nombre = screen.getByPlaceholderText('Ej.: Distribuidora Farmacéutica S. A.…');
    await user.clear(nombre);
    await user.type(nombre, 'Distribuidora Nueva');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(acciones.actualizar).toHaveBeenCalledWith(1, { nombre: 'Distribuidora Nueva' }));
  });

  it('protege los cambios sin guardar al cerrar el formulario', async () => {
    const user = userEvent.setup();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderizar();
    await user.click(screen.getByRole('button', { name: 'Nuevo proveedor' }));
    await user.type(screen.getByPlaceholderText('Ej.: Distribuidora Farmacéutica S. A.…'), 'Nueva');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Nuevo proveedor' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Nuevo proveedor' })).not.toBeInTheDocument();
    expect(confirmar).toHaveBeenCalledTimes(2);
    confirmar.mockRestore();
  });

  it('cambia el estado de un proveedor después de confirmar', async () => {
    const user = userEvent.setup();
    acciones.cambiarEstado.mockResolvedValue({});
    renderizar();
    await elegirAccion(user, 'Distribuidora ABC', 'Desactivar');
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(acciones.cambiarEstado).toHaveBeenCalledWith(1, false));
  });

  it('activa un proveedor inactivo', async () => {
    const user = userEvent.setup();
    estadoProveedores.proveedores = [{ id_proveedor: 2, nombre: 'Distribuidora Norte', activo: false }];
    acciones.cambiarEstado.mockResolvedValue({});
    renderizar();
    await elegirAccion(user, 'Distribuidora Norte', 'Activar');
    await user.click(screen.getByRole('button', { name: 'Activar' }));
    await waitFor(() => expect(acciones.cambiarEstado).toHaveBeenCalledWith(2, true));
  });

  it('muestra un error cuando falla cambiar el estado', async () => {
    const user = userEvent.setup();
    acciones.cambiarEstado.mockRejectedValue({ response: { data: { mensaje: 'No se pudo' } } });
    renderizar();
    await elegirAccion(user, 'Distribuidora ABC', 'Desactivar');
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(await screen.findByText('No se pudo')).toBeInTheDocument();
  });

  it('procesa la eliminación segura de un proveedor', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockResolvedValue({ mensaje: 'Proveedor eliminado correctamente' });
    renderizar();
    await elegirAccion(user, 'Distribuidora ABC', 'Eliminar');
    expect(screen.getByText('Eliminar o desactivar')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(acciones.eliminar).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Proveedor eliminado correctamente')).toBeInTheDocument();
  });

  it('mantiene abierto el diálogo si falla la eliminación', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockRejectedValue(new Error('Network Error'));
    renderizar();
    await elegirAccion(user, 'Distribuidora ABC', 'Eliminar');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('No se pudo procesar el proveedor.')).toBeInTheDocument();
    expect(screen.getByText('Eliminar o desactivar')).toBeInTheDocument();
  });
});
