import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useProveedores from './useProveedores';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('useProveedores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga los proveedores al montar', async () => {
    api.get.mockResolvedValue({ data: [{ id_proveedor: 1 }] });

    const { result } = renderHook(() => useProveedores());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.proveedores).toEqual([{ id_proveedor: 1 }]);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useProveedores());

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('crea un proveedor y lo agrega a la lista', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useProveedores());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_proveedor: 1, nombre: 'ABC' } });

    await act(async () => {
      await result.current.crear({ nombre: 'ABC' });
    });

    expect(result.current.proveedores).toEqual([{ id_proveedor: 1, nombre: 'ABC' }]);
  });

  it('cambia el estado de un proveedor', async () => {
    api.get.mockResolvedValue({ data: [{ id_proveedor: 1, activo: true }] });
    const { result } = renderHook(() => useProveedores());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.patch.mockResolvedValue({ data: { id_proveedor: 1, activo: false } });

    await act(async () => {
      await result.current.cambiarEstado(1, false);
    });

    expect(result.current.proveedores[0].activo).toBe(false);
  });

  it('elimina un proveedor de la lista', async () => {
    api.get.mockResolvedValue({ data: [{ id_proveedor: 1 }] });
    const { result } = renderHook(() => useProveedores());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminar(1);
    });

    expect(result.current.proveedores).toEqual([]);
  });
});
