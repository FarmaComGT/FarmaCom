import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useContactosCasa from './useContactosCasa';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('useContactosCasa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta nada sin id de casa', () => {
    const { result } = renderHook(() => useContactosCasa(null));

    expect(result.current.telefonos).toEqual([]);
    expect(result.current.correos).toEqual([]);
    expect(result.current.proveedores).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('carga teléfonos, correos y proveedores en paralelo', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/telefonos')) return Promise.resolve({ data: [{ id_telefono: 1 }] });
      if (url.includes('/correos')) return Promise.resolve({ data: [{ id_email: 1 }] });
      return Promise.resolve({ data: [{ id_proveedor: 1 }] });
    });

    const { result } = renderHook(() => useContactosCasa(5));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.telefonos).toEqual([{ id_telefono: 1 }]);
    expect(result.current.correos).toEqual([{ id_email: 1 }]);
    expect(result.current.proveedores).toEqual([{ id_proveedor: 1 }]);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useContactosCasa(5));

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('agrega un teléfono a la casa', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useContactosCasa(5));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_telefono: 1, numero: '123' } });

    await act(async () => {
      await result.current.agregarTelefono('123');
    });

    expect(api.post).toHaveBeenCalledWith('/casas/5/telefonos', { numero: '123' });
    expect(result.current.telefonos).toEqual([{ id_telefono: 1, numero: '123' }]);
  });

  it('elimina un correo de la casa', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/correos')
        ? Promise.resolve({ data: [{ id_email: 1 }] })
        : Promise.resolve({ data: [] })
    ));
    const { result } = renderHook(() => useContactosCasa(5));
    await waitFor(() => expect(result.current.correos).toEqual([{ id_email: 1 }]));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminarCorreo(1);
    });

    expect(api.delete).toHaveBeenCalledWith('/casas/5/correos/1');
    expect(result.current.correos).toEqual([]);
  });
});
