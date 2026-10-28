import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useSucursales from './useSucursales';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('useSucursales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga las sucursales al montar', async () => {
    api.get.mockResolvedValue({ data: [{ id_sucursal: 1 }] });

    const { result } = renderHook(() => useSucursales());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.sucursales).toEqual([{ id_sucursal: 1 }]);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useSucursales());

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('usa el mensaje predeterminado si falla la carga sin respuesta HTTP', async () => {
    api.get.mockRejectedValue(new Error('Sin conexión'));

    const { result } = renderHook(() => useSucursales());

    await waitFor(() => expect(result.current.error).toBe('Error al cargar sucursales'));
  });

  it('crea una sucursal y la agrega a la lista', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useSucursales());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_sucursal: 1, nombre_sucursal: 'Central' } });

    await act(async () => {
      await result.current.crear({ nombre_sucursal: 'Central' });
    });

    expect(result.current.sucursales).toEqual([{ id_sucursal: 1, nombre_sucursal: 'Central' }]);
  });

  it('traduce el error al crear una sucursal', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useSucursales());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockRejectedValue({ response: { data: { mensaje: 'Nombre repetido' } } });

    await expect(result.current.crear({})).rejects.toThrow('Nombre repetido');
  });

  it('usa el mensaje predeterminado si crear falla sin respuesta HTTP', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useSucursales());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockRejectedValue(new Error('Sin conexión'));

    await expect(result.current.crear({})).rejects.toThrow('Error al crear sucursal');
  });

  it('actualiza una sucursal existente', async () => {
    api.get.mockResolvedValue({
      data: [
        { id_sucursal: 1, nombre_sucursal: 'Central' },
        { id_sucursal: 2, nombre_sucursal: 'Sur' },
      ],
    });
    const { result } = renderHook(() => useSucursales());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.put.mockResolvedValue({ data: { id_sucursal: 1, nombre_sucursal: 'Norte' } });

    await act(async () => {
      await result.current.actualizar(1, { nombre_sucursal: 'Norte' });
    });

    expect(result.current.sucursales).toEqual([
      { id_sucursal: 1, nombre_sucursal: 'Norte' },
      { id_sucursal: 2, nombre_sucursal: 'Sur' },
    ]);
  });

  it('traduce errores del backend y de red al actualizar', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useSucursales());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.put.mockRejectedValueOnce({ response: { data: { mensaje: 'Sucursal inválida' } } });
    await expect(result.current.actualizar(1, {})).rejects.toThrow('Sucursal inválida');

    api.put.mockRejectedValueOnce(new Error('Sin conexión'));
    await expect(result.current.actualizar(1, {})).rejects.toThrow('Error al actualizar sucursal');
  });

  it('elimina una sucursal de la lista', async () => {
    api.get.mockResolvedValue({ data: [{ id_sucursal: 1 }] });
    const { result } = renderHook(() => useSucursales());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminar(1);
    });

    expect(result.current.sucursales).toEqual([]);
  });

  it('traduce el error al eliminar una sucursal', async () => {
    api.get.mockResolvedValue({ data: [{ id_sucursal: 1 }] });
    const { result } = renderHook(() => useSucursales());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.delete.mockRejectedValue({ response: { data: { mensaje: 'Tiene usuarios asignados' } } });

    await expect(result.current.eliminar(1)).rejects.toThrow('Tiene usuarios asignados');
  });

  it('usa el mensaje predeterminado si eliminar falla sin respuesta HTTP', async () => {
    api.get.mockResolvedValue({ data: [{ id_sucursal: 1 }] });
    const { result } = renderHook(() => useSucursales());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.delete.mockRejectedValue(new Error('Sin conexión'));

    await expect(result.current.eliminar(1)).rejects.toThrow('Error al eliminar sucursal');
  });
});
