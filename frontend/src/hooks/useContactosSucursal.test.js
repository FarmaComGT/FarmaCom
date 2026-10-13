import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useContactosSucursal from './useContactosSucursal';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('useContactosSucursal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta nada sin id de sucursal', () => {
    renderHook(() => useContactosSucursal(null));

    expect(api.get).not.toHaveBeenCalled();
  });

  it('carga teléfonos y correos en paralelo', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/telefonos')
        ? Promise.resolve({ data: [{ id_telefono_sucursal: 1 }] })
        : Promise.resolve({ data: [{ id_correo_sucursal: 1 }] })
    ));

    const { result } = renderHook(() => useContactosSucursal(3));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.telefonos).toEqual([{ id_telefono_sucursal: 1 }]);
    expect(result.current.correos).toEqual([{ id_correo_sucursal: 1 }]);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useContactosSucursal(3));

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('agrega un teléfono a la sucursal', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useContactosSucursal(3));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_telefono_sucursal: 1, numero: '123' } });

    await act(async () => {
      await result.current.agregarTelefono('123');
    });

    expect(api.post).toHaveBeenCalledWith('/sucursales/3/telefonos', { numero: '123' });
    expect(result.current.telefonos).toEqual([{ id_telefono_sucursal: 1, numero: '123' }]);
  });

  it('actualiza un teléfono usando la ruta plana /telefonos/:id', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/telefonos')
        ? Promise.resolve({ data: [{ id_telefono_sucursal: 1, numero: '123' }] })
        : Promise.resolve({ data: [] })
    ));
    const { result } = renderHook(() => useContactosSucursal(3));
    await waitFor(() => expect(result.current.telefonos).toEqual([
      { id_telefono_sucursal: 1, numero: '123' },
    ]));

    api.put.mockResolvedValue({ data: { id_telefono_sucursal: 1, numero: '456' } });

    await act(async () => {
      await result.current.actualizarTelefono(1, '456');
    });

    expect(api.put).toHaveBeenCalledWith('/telefonos/1', { numero: '456' });
    expect(result.current.telefonos[0].numero).toBe('456');
  });

  it('agrega un correo a la sucursal', async () => {
    api.get.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useContactosSucursal(3));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    api.post.mockResolvedValue({ data: { id_correo_sucursal: 1, correo: 'a@b.com' } });

    await act(async () => {
      await result.current.agregarCorreo('a@b.com');
    });

    expect(api.post).toHaveBeenCalledWith('/sucursales/3/correos', { correo: 'a@b.com' });
    expect(result.current.correos).toEqual([{ id_correo_sucursal: 1, correo: 'a@b.com' }]);
  });

  it('elimina un correo usando la ruta plana /correos/:id', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/correos')
        ? Promise.resolve({ data: [{ id_correo_sucursal: 1 }] })
        : Promise.resolve({ data: [] })
    ));
    const { result } = renderHook(() => useContactosSucursal(3));
    await waitFor(() => expect(result.current.correos).toEqual([{ id_correo_sucursal: 1 }]));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminarCorreo(1);
    });

    expect(api.delete).toHaveBeenCalledWith('/correos/1');
    expect(result.current.correos).toEqual([]);
  });

  it('actualiza un correo usando la ruta plana /correos/:id', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/correos')
        ? Promise.resolve({ data: [{ id_correo_sucursal: 1, correo: 'a@b.com' }] })
        : Promise.resolve({ data: [] })
    ));
    const { result } = renderHook(() => useContactosSucursal(3));
    await waitFor(() => expect(result.current.correos).toEqual([
      { id_correo_sucursal: 1, correo: 'a@b.com' },
    ]));

    api.put.mockResolvedValue({ data: { id_correo_sucursal: 1, correo: 'nuevo@b.com' } });

    await act(async () => {
      await result.current.actualizarCorreo(1, 'nuevo@b.com');
    });

    expect(api.put).toHaveBeenCalledWith('/correos/1', { correo: 'nuevo@b.com' });
    expect(result.current.correos[0].correo).toBe('nuevo@b.com');
  });

  it('elimina un teléfono usando la ruta plana /telefonos/:id', async () => {
    api.get.mockImplementation((url) => (
      url.includes('/telefonos')
        ? Promise.resolve({ data: [{ id_telefono_sucursal: 1 }] })
        : Promise.resolve({ data: [] })
    ));
    const { result } = renderHook(() => useContactosSucursal(3));
    await waitFor(() => expect(result.current.telefonos).toEqual([{ id_telefono_sucursal: 1 }]));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminarTelefono(1);
    });

    expect(api.delete).toHaveBeenCalledWith('/telefonos/1');
    expect(result.current.telefonos).toEqual([]);
  });
});
