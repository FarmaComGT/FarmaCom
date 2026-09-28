import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useCasas from './useCasas';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('useCasas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga las casas al montar', async () => {
    const casas = [{ id_casa: 1, nombre: 'Bayer' }];
    api.get.mockResolvedValue({ data: casas });

    const { result } = renderHook(() => useCasas());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.casas).toEqual(casas);
    expect(api.get).toHaveBeenCalledWith('/casas');
  });

  it('expone el mensaje de error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'No se pudo conectar' } } });

    const { result } = renderHook(() => useCasas());

    await waitFor(() => expect(result.current.error).toBe('No se pudo conectar'));
    expect(result.current.casas).toEqual([]);
  });

  it('crea una casa y la agrega a la lista', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useCasas());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_casa: 1, nombre: 'Bayer' } });

    await act(async () => {
      await result.current.crear({ nombre: 'Bayer' });
    });

    expect(api.post).toHaveBeenCalledWith('/casas', { nombre: 'Bayer' });
    expect(result.current.casas).toEqual([{ id_casa: 1, nombre: 'Bayer' }]);
  });

  it('actualiza una casa existente', async () => {
    api.get.mockResolvedValue({ data: [{ id_casa: 1, nombre: 'Bayer' }] });
    const { result } = renderHook(() => useCasas());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.put.mockResolvedValue({ data: { id_casa: 1, nombre: 'Bayer S.A.' } });

    await act(async () => {
      await result.current.actualizar(1, { nombre: 'Bayer S.A.' });
    });

    expect(api.put).toHaveBeenCalledWith('/casas/1', { nombre: 'Bayer S.A.' });
    expect(result.current.casas).toEqual([{ id_casa: 1, nombre: 'Bayer S.A.' }]);
  });

  it('cambia el estado de una casa', async () => {
    api.get.mockResolvedValue({ data: [{ id_casa: 1, activo: true }] });
    const { result } = renderHook(() => useCasas());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.patch.mockResolvedValue({ data: { id_casa: 1, activo: false } });

    await act(async () => {
      await result.current.cambiarEstado(1, false);
    });

    expect(api.patch).toHaveBeenCalledWith('/casas/1/estado', { activo: false });
    expect(result.current.casas).toEqual([{ id_casa: 1, activo: false }]);
  });

  it('elimina una casa de la lista', async () => {
    api.get.mockResolvedValue({ data: [{ id_casa: 1 }, { id_casa: 2 }] });
    const { result } = renderHook(() => useCasas());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminar(1);
    });

    expect(api.delete).toHaveBeenCalledWith('/casas/1');
    expect(result.current.casas).toEqual([{ id_casa: 2 }]);
  });
});
