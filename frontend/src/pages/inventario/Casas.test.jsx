import { ToastProvider } from '../../context/ToastContext.jsx';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Casas from './Casas.jsx';
import { elegirAccion } from '../../test/menuAcciones';

const acciones = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  cambiarEstado: vi.fn(),
  eliminar: vi.fn(),
  refrescar: vi.fn(),
}));

const estadoCasas = vi.hoisted(() => ({
  casas: [{ id_casa: 1, nombre: 'Bayer', activo: true }],
  cargando: false,
  error: null,
}));

vi.mock('../../hooks/useCasas', () => ({
  default: () => ({
    ...estadoCasas,
    refrescar: acciones.refrescar,
    crear: acciones.crear,
    actualizar: acciones.actualizar,
    cambiarEstado: acciones.cambiarEstado,
    eliminar: acciones.eliminar,
  }),
}));

const renderizar = (ruta = '/') => render(
  <ToastProvider><MemoryRouter initialEntries={[ruta]}>
    <Casas />
  </MemoryRouter></ToastProvider>,
);

describe('pantalla de casas farmacéuticas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estadoCasas.casas = [{ id_casa: 1, nombre: 'Bayer', activo: true }];
    estadoCasas.cargando = false;
    estadoCasas.error = null;
  });

  it('muestra las casas registradas y permite buscarlas', async () => {
    const user = userEvent.setup();
    renderizar();

    expect(screen.getByText('Bayer')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar casa farmacéutica…'), 'no existe');
    expect(screen.getByText('Sin coincidencias')).toBeInTheDocument();
  });

  it('filtra casas activas e inactivas y restablece el filtro', async () => {
    const user = userEvent.setup();
    estadoCasas.casas = [
      { id_casa: 1, nombre: 'Bayer', activo: true },
      { id_casa: 2, nombre: 'Roche', activo: false },
    ];
    renderizar('/?estado=inactiva');

    expect(screen.queryByText('Bayer')).not.toBeInTheDocument();
    expect(screen.getByText('Roche')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Activas/ }));
    expect(screen.getByText('Bayer')).toBeInTheDocument();
    expect(screen.queryByText('Roche')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Todas/ }));
    expect(screen.getByText('Bayer')).toBeInTheDocument();
    expect(screen.getByText('Roche')).toBeInTheDocument();
  });

  it('muestra los estados de carga, error y catálogo vacío', async () => {
    const user = userEvent.setup();
    estadoCasas.casas = [];
    estadoCasas.cargando = true;
    const carga = renderizar();
    expect(screen.getByText('Cargando casas farmacéuticas…')).toBeInTheDocument();
    carga.unmount();

    estadoCasas.cargando = false;
    estadoCasas.error = 'Servicio no disponible';
    const error = renderizar();
    expect(screen.getByText('No se pudieron cargar las casas farmacéuticas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(acciones.refrescar).toHaveBeenCalledOnce();
    error.unmount();

    estadoCasas.error = null;
    renderizar();
    expect(screen.getByText('Aún no hay casas farmacéuticas')).toBeInTheDocument();
  });

  it('crea una casa farmacéutica nueva', async () => {
    const user = userEvent.setup();
    acciones.crear.mockResolvedValue({ id_casa: 2 });
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva casa farmacéutica' }));
    await user.type(screen.getByPlaceholderText('Ej.: Laboratorios Bayer S. A.…'), 'Roche');
    await user.click(screen.getByRole('button', { name: 'Crear casa' }));

    await waitFor(() => expect(acciones.crear).toHaveBeenCalledWith({ nombre: 'Roche' }));
  });

  it('no crea una casa con un nombre de solo espacios', async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva casa farmacéutica' }));
    await user.type(screen.getByPlaceholderText('Ej.: Laboratorios Bayer S. A.…'), '   ');
    await user.click(screen.getByRole('button', { name: 'Crear casa' }));

    expect(screen.getByText('El nombre es requerido.')).toBeInTheDocument();
    expect(acciones.crear).not.toHaveBeenCalled();
  });

  it('edita una casa existente', async () => {
    const user = userEvent.setup();
    acciones.actualizar.mockResolvedValue({ id_casa: 1 });
    renderizar();

    await elegirAccion(user, 'Bayer', 'Editar');
    const nombre = screen.getByPlaceholderText('Ej.: Laboratorios Bayer S. A.…');
    await user.clear(nombre);
    await user.type(nombre, 'Bayer S.A.');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(acciones.actualizar).toHaveBeenCalledWith(1, { nombre: 'Bayer S.A.' }));
  });

  it('cambia el estado de una casa', async () => {
    const user = userEvent.setup();
    acciones.cambiarEstado.mockResolvedValue({});
    renderizar();

    await elegirAccion(user, 'Bayer', 'Desactivar');
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));

    await waitFor(() => expect(acciones.cambiarEstado).toHaveBeenCalledWith(1, false));
  });

  it('activa una casa inactiva', async () => {
    const user = userEvent.setup();
    estadoCasas.casas = [{ id_casa: 2, nombre: 'Roche', activo: false }];
    acciones.cambiarEstado.mockResolvedValue({});
    renderizar();

    await elegirAccion(user, 'Roche', 'Activar');
    expect(screen.getByText('Volverá a estar disponible en el catálogo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Activar' }));

    await waitFor(() => expect(acciones.cambiarEstado).toHaveBeenCalledWith(2, true));
  });

  it('muestra un error cuando falla cambiar el estado', async () => {
    const user = userEvent.setup();
    acciones.cambiarEstado.mockRejectedValue({ response: { data: { mensaje: 'No se pudo' } } });
    renderizar();

    await elegirAccion(user, 'Bayer', 'Desactivar');
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('No se pudo')).toBeInTheDocument();
  });

  it('protege los cambios sin guardar al cerrar el formulario', async () => {
    const user = userEvent.setup();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderizar();

    await user.click(screen.getByRole('button', { name: 'Nueva casa farmacéutica' }));
    await user.type(screen.getByPlaceholderText('Ej.: Laboratorios Bayer S. A.…'), 'Nueva');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Nueva casa farmacéutica' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Nueva casa farmacéutica' })).not.toBeInTheDocument();
    expect(confirmar).toHaveBeenCalledTimes(2);
    confirmar.mockRestore();
  });

  it('elimina una casa tras confirmar', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockResolvedValue({});
    renderizar();

    await elegirAccion(user, 'Bayer', 'Eliminar');
    expect(screen.getByText('Eliminar o desactivar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => expect(acciones.eliminar).toHaveBeenCalledWith(1));
    expect(screen.getByRole('status')).toHaveTextContent('Casa farmacéutica procesada correctamente.');
  });

  it('cancela la eliminación de una casa', async () => {
    const user = userEvent.setup();
    renderizar();

    await elegirAccion(user, 'Bayer', 'Eliminar');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Eliminar o desactivar')).not.toBeInTheDocument();
    expect(acciones.eliminar).not.toHaveBeenCalled();
  });

  it('mantiene abierto el diálogo si falla la eliminación', async () => {
    const user = userEvent.setup();
    acciones.eliminar.mockRejectedValue(new Error('Network Error'));
    renderizar();

    await elegirAccion(user, 'Bayer', 'Eliminar');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('No se pudo eliminar la casa farmacéutica.')).toBeInTheDocument();
    expect(screen.getByText('Eliminar o desactivar')).toBeInTheDocument();
  });
});
