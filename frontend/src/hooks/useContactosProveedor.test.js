import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useContactosProveedor from './useContactosProveedor';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('useContactosProveedor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta nada sin id de proveedor', () => {
    const { result } = renderHook(() => useContactosProveedor(null));

    expect(result.current.telefonos).toEqual([]);
    expect(result.current.correos).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('carga teléfonos y correos en paralelo', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/telefonos')
        ? Promise.resolve({ data: [{ id_telefono: 1 }] })
        : Promise.resolve({ data: [{ id_email: 1 }] })
    ));

    const { result } = renderHook(() => useContactosProveedor(9));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.telefonos).toEqual([{ id_telefono: 1 }]);
    expect(result.current.correos).toEqual([{ id_email: 1 }]);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useContactosProveedor(9));

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('agrega un teléfono nuevo', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useContactosProveedor(9));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_telefono: 1, numero: '123' } });

    await act(async () => {
      await result.current.agregarTelefono('123');
    });

    expect(api.post).toHaveBeenCalledWith('/proveedores/9/telefonos', { numero: '123' });
    expect(result.current.telefonos).toEqual([{ id_telefono: 1, numero: '123' }]);
  });

  it('elimina un teléfono', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/telefonos')
        ? Promise.resolve({ data: [{ id_telefono: 1 }] })
        : Promise.resolve({ data: [] })
    ));
    const { result } = renderHook(() => useContactosProveedor(9));
    await waitFor(() => expect(result.current.telefonos).toEqual([{ id_telefono: 1 }]));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminarTelefono(1);
    });

    expect(api.delete).toHaveBeenCalledWith('/proveedores/9/telefonos/1');
    expect(result.current.telefonos).toEqual([]);
  });

  it('agrega un correo nuevo', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useContactosProveedor(9));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_email: 1, correo: 'a@b.com' } });

    await act(async () => {
      await result.current.agregarCorreo('a@b.com');
    });

    expect(api.post).toHaveBeenCalledWith('/proveedores/9/correos', { correo: 'a@b.com' });
    expect(result.current.correos).toEqual([{ id_email: 1, correo: 'a@b.com' }]);
  });

  it('actualiza un correo existente', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/correos')
        ? Promise.resolve({ data: [{ id_email: 1, correo: 'a@b.com' }] })
        : Promise.resolve({ data: [] })
    ));
    const { result } = renderHook(() => useContactosProveedor(9));
    await waitFor(() => expect(result.current.correos).toEqual([{ id_email: 1, correo: 'a@b.com' }]));

    api.put.mockResolvedValue({ data: { id_email: 1, correo: 'nuevo@b.com' } });

    await act(async () => {
      await result.current.actualizarCorreo(1, 'nuevo@b.com');
    });

    expect(api.put).toHaveBeenCalledWith('/proveedores/9/correos/1', { correo: 'nuevo@b.com' });
    expect(result.current.correos).toEqual([{ id_email: 1, correo: 'nuevo@b.com' }]);
  });

  it('actualiza un teléfono existente', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/telefonos')
        ? Promise.resolve({ data: [{ id_telefono: 1, numero: '123' }] })
        : Promise.resolve({ data: [] })
    ));
    const { result } = renderHook(() => useContactosProveedor(9));
    await waitFor(() => expect(result.current.telefonos).toEqual([{ id_telefono: 1, numero: '123' }]));

    api.put.mockResolvedValue({ data: { id_telefono: 1, numero: '456' } });

    await act(async () => {
      await result.current.actualizarTelefono(1, '456');
    });

    expect(api.put).toHaveBeenCalledWith('/proveedores/9/telefonos/1', { numero: '456' });
    expect(result.current.telefonos[0].numero).toBe('456');
  });

  it('elimina un correo', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/correos')
        ? Promise.resolve({ data: [{ id_email: 1 }] })
        : Promise.resolve({ data: [] })
    ));
    const { result } = renderHook(() => useContactosProveedor(9));
    await waitFor(() => expect(result.current.correos).toEqual([{ id_email: 1 }]));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminarCorreo(1);
    });

    expect(api.delete).toHaveBeenCalledWith('/proveedores/9/correos/1');
    expect(result.current.correos).toEqual([]);
  });
});
