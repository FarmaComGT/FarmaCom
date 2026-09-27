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

  it('cambia el estado de un usuario', async () => {
    api.get.mockResolvedValue({ data: [{ id_usuario: 1, estado_usuario: 'activo' }] });
    const { result } = renderHook(() => useUsuarios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.patch.mockResolvedValue({ data: { id_usuario: 1, estado_usuario: 'inactivo' } });

    await act(async () => {
      await result.current.cambiarEstado(1, 'inactivo');
    });

    expect(result.current.usuarios[0].estado_usuario).toBe('inactivo');
  });
});
