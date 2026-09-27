import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useProductos from './useProductos';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

describe('useProductos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga los productos al montar', async () => {
    api.get.mockResolvedValue({ data: [{ id_producto: 1 }] });

    const { result } = renderHook(() => useProductos());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.productos).toEqual([{ id_producto: 1 }]);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useProductos());

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('crea un producto y lo agrega a la lista', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useProductos());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_producto: 1 } });

    await act(async () => {
      await result.current.crear({ nombre_comercial: 'X' });
    });

    expect(result.current.productos).toEqual([{ id_producto: 1 }]);
  });

  it('traduce el error al crear un producto', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useProductos());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockRejectedValue({ response: { data: { mensaje: 'Código repetido' } } });

    await expect(result.current.crear({})).rejects.toThrow('Código repetido');
  });

  it('actualiza un producto existente', async () => {
    api.get.mockResolvedValue({ data: [{ id_producto: 1, nombre_comercial: 'X' }] });
    const { result } = renderHook(() => useProductos());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.put.mockResolvedValue({ data: { id_producto: 1, nombre_comercial: 'Y' } });

    await act(async () => {
      await result.current.actualizar(1, { nombre_comercial: 'Y' });
    });

    expect(result.current.productos[0].nombre_comercial).toBe('Y');
  });

  it('cambia el estado combinando la respuesta anidada del backend', async () => {
    api.get.mockResolvedValue({ data: [{ id_producto: 1, activo: true }] });
    const { result } = renderHook(() => useProductos());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.patch.mockResolvedValue({ data: { producto: { activo: false } } });

    await act(async () => {
      await result.current.cambiarEstado(1, false);
    });

    expect(result.current.productos[0]).toEqual({ id_producto: 1, activo: false });
  });
});
