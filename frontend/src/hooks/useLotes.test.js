import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useLotes from './useLotes';

vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('useLotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea un lote mediante POST', async () => {
    const lote = { id_lote: 1, numero_lote: 'LT-001' };
    api.post.mockResolvedValue({ data: lote });
    const { result } = renderHook(() => useLotes());

    let respuesta;
    await act(async () => {
      respuesta = await result.current.crear({ numero_lote: 'LT-001' });
    });

    expect(api.post).toHaveBeenCalledWith('/lotes', { numero_lote: 'LT-001' });
    expect(respuesta).toEqual(lote);
    expect(result.current.error).toBeNull();
    expect(result.current.guardando).toBe(false);
  });

  it('usa el primer mensaje de "errores" cuando no hay "mensaje" directo', async () => {
    api.post.mockRejectedValue({
      response: { data: { errores: [{ msg: 'El numero_lote es requerido' }] } },
    });
    const { result } = renderHook(() => useLotes());

    await act(async () => {
      await expect(result.current.crear({})).rejects.toThrow('El numero_lote es requerido');
    });

    await waitFor(() => expect(result.current.error).toBe('El numero_lote es requerido'));
  });

  it('usa el mensaje genérico cuando el error no trae respuesta del backend', async () => {
    api.post.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useLotes());

    await act(async () => {
      await expect(result.current.crear({})).rejects.toThrow('Network Error');
    });

    await waitFor(() => expect(result.current.error).toBe('Network Error'));
  });

  it('usa el mensaje por defecto cuando el error no tiene detalle alguno', async () => {
    api.post.mockRejectedValue({});
    const { result } = renderHook(() => useLotes());

    await act(async () => {
      await expect(result.current.crear({})).rejects.toThrow('Error al crear lote');
    });

    await waitFor(() => expect(result.current.error).toBe('Error al crear lote'));
  });

  it('limpia el error', async () => {
    api.post.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });
    const { result } = renderHook(() => useLotes());

    await act(async () => {
      await expect(result.current.crear({})).rejects.toThrow();
    });
    await waitFor(() => expect(result.current.error).toBe('Fallo'));

    act(() => {
      result.current.limpiarError();
    });

    expect(result.current.error).toBeNull();
  });

  it('actualiza un lote mediante PATCH', async () => {
    const lote = { id_lote: 7, numero_lote: 'LT-002' };
    api.patch.mockResolvedValue({ data: lote });
    const { result } = renderHook(() => useLotes());

    let respuesta;
    await act(async () => {
      respuesta = await result.current.actualizar(7, { numero_lote: 'LT-002' });
    });

    expect(api.patch).toHaveBeenCalledWith('/lotes/7', { numero_lote: 'LT-002' });
    expect(respuesta).toEqual(lote);
    expect(result.current.error).toBeNull();
  });

  it('elimina un lote mediante DELETE', async () => {
    api.delete.mockResolvedValue({ data: { mensaje: 'Lote eliminado correctamente' } });
    const { result } = renderHook(() => useLotes());

    await act(async () => {
      await result.current.eliminar(7);
    });

    expect(api.delete).toHaveBeenCalledWith('/lotes/7');
    expect(result.current.guardando).toBe(false);
  });

  it('expone el mensaje del backend cuando no puede eliminarse', async () => {
    api.delete.mockRejectedValue({
      response: { data: { mensaje: 'No se puede eliminar un lote asociado a ventas' } },
    });
    const { result } = renderHook(() => useLotes());

    await act(async () => {
      await expect(result.current.eliminar(7)).rejects.toThrow(
        'No se puede eliminar un lote asociado a ventas',
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBe('No se puede eliminar un lote asociado a ventas');
    });
  });
});
