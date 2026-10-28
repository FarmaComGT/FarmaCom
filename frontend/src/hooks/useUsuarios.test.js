import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useUsuarios from './useUsuarios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

describe('useUsuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga los usuarios al montar', async () => {
    api.get.mockResolvedValue({ data: [{ id_usuario: 1 }] });

    const { result } = renderHook(() => useUsuarios());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.usuarios).toEqual([{ id_usuario: 1 }]);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useUsuarios());

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('usa el mensaje predeterminado si falla la carga sin respuesta HTTP', async () => {
    api.get.mockRejectedValue(new Error('Sin conexión'));

    const { result } = renderHook(() => useUsuarios());

    await waitFor(() => expect(result.current.error).toBe('Error al cargar usuarios'));
  });

  it('crea un usuario y lo agrega a la lista', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_usuario: 1, nombre_usuario: 'Ana' } });

    await act(async () => {
      await result.current.crear({ nombre_usuario: 'Ana' });
    });

    expect(result.current.usuarios).toEqual([{ id_usuario: 1, nombre_usuario: 'Ana' }]);
  });

  it('traduce el error al crear un usuario', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockRejectedValue({ response: { data: { mensaje: 'Correo repetido' } } });

    await expect(result.current.crear({})).rejects.toThrow('Correo repetido');
  });

  it('usa el mensaje predeterminado si crear falla sin respuesta HTTP', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockRejectedValue(new Error('Sin conexión'));

    await expect(result.current.crear({})).rejects.toThrow('Error al crear usuario');
  });

  it('actualiza un usuario existente', async () => {
    api.get.mockResolvedValue({ data: [{ id_usuario: 1, nombre_usuario: 'Ana' }] });
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.put.mockResolvedValue({ data: { id_usuario: 1, nombre_usuario: 'Ana María' } });

    await act(async () => {
      await result.current.actualizar(1, { nombre_usuario: 'Ana María' });
    });

    expect(result.current.usuarios[0].nombre_usuario).toBe('Ana María');
  });

  it('actualiza sólo el usuario indicado y conserva los demás', async () => {
    api.get.mockResolvedValue({
      data: [
        { id_usuario: 1, nombre_usuario: 'Ana' },
        { id_usuario: 2, nombre_usuario: 'Luis' },
      ],
    });
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.put.mockResolvedValue({ data: { id_usuario: 2, nombre_usuario: 'Luis Alberto' } });

    await act(async () => {
      await result.current.actualizar(2, { nombre_usuario: 'Luis Alberto' });
    });

    expect(result.current.usuarios).toEqual([
      { id_usuario: 1, nombre_usuario: 'Ana' },
      { id_usuario: 2, nombre_usuario: 'Luis Alberto' },
    ]);
  });

  it('traduce errores del backend y de red al actualizar', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.put.mockRejectedValueOnce({ response: { data: { mensaje: 'Usuario inválido' } } });
    await expect(result.current.actualizar(1, {})).rejects.toThrow('Usuario inválido');

    api.put.mockRejectedValueOnce(new Error('Sin conexión'));
    await expect(result.current.actualizar(1, {})).rejects.toThrow('Error al actualizar usuario');
  });

  it('cambia el estado de un usuario', async () => {
    api.get.mockResolvedValue({
      data: [
        { id_usuario: 1, estado_usuario: 'activo' },
        { id_usuario: 2, estado_usuario: 'activo' },
      ],
    });
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.patch.mockResolvedValue({ data: { id_usuario: 1, estado_usuario: 'inactivo' } });

    await act(async () => {
      await result.current.cambiarEstado(1, 'inactivo');
    });

    expect(result.current.usuarios).toEqual([
      { id_usuario: 1, estado_usuario: 'inactivo' },
      { id_usuario: 2, estado_usuario: 'activo' },
    ]);
  });

  it('traduce errores del backend y de red al cambiar el estado', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.patch.mockRejectedValueOnce({ response: { data: { mensaje: 'Cambio rechazado' } } });
    await expect(result.current.cambiarEstado(1, 'inactivo')).rejects.toThrow('Cambio rechazado');

    api.patch.mockRejectedValueOnce(new Error('Sin conexión'));
    await expect(result.current.cambiarEstado(1, 'inactivo')).rejects.toThrow(
      'Error al cambiar estado del usuario',
    );
  });
});
