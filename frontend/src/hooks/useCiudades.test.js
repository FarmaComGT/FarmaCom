import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import useCiudades from './useCiudades';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('useCiudades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga las ciudades ordenadas alfabéticamente', async () => {
    api.get.mockResolvedValue({
      data: [{ id_ciudad: 1, nombre_ciudad: 'Retalhuleu' }, { id_ciudad: 2, nombre_ciudad: 'Antigua' }],
    });

    const { result } = renderHook(() => useCiudades());

    await waitFor(() => expect(result.current.cargandoCiudades).toBe(false));
    expect(result.current.ciudades.map((c) => c.nombre_ciudad)).toEqual(['Retalhuleu', 'Antigua']);
  });

  it('expone el error del backend si falla la carga', async () => {
    api.get.mockRejectedValue({ response: { data: { mensaje: 'No se pudo conectar' } } });

    const { result } = renderHook(() => useCiudades());

    await waitFor(() => expect(result.current.errorCiudades).toBe('No se pudo conectar'));
  });

  it('crea una ciudad y la inserta ordenada', async () => {
    api.get.mockResolvedValue({ data: [{ id_ciudad: 1, nombre_ciudad: 'Retalhuleu' }] });
    const { result } = renderHook(() => useCiudades());
    await waitFor(() => expect(result.current.cargandoCiudades).toBe(false));

    api.post.mockResolvedValue({ data: { id_ciudad: 2, nombre_ciudad: 'Antigua' } });

    await act(async () => {
      await result.current.crear({ nombre_ciudad: 'Antigua' });
    });

    expect(result.current.ciudades.map((c) => c.nombre_ciudad)).toEqual(['Antigua', 'Retalhuleu']);
  });

  it('actualiza una ciudad existente', async () => {
    api.get.mockResolvedValue({ data: [{ id_ciudad: 1, nombre_ciudad: 'Retalhuleu' }] });
    const { result } = renderHook(() => useCiudades());
    await waitFor(() => expect(result.current.cargandoCiudades).toBe(false));

    api.put.mockResolvedValue({ data: { id_ciudad: 1, nombre_ciudad: 'Retalhuleu 2' } });

    await act(async () => {
      await result.current.actualizar(1, { nombre_ciudad: 'Retalhuleu 2' });
    });

    expect(api.put).toHaveBeenCalledWith('/ciudades/1', { nombre_ciudad: 'Retalhuleu 2' });
    expect(result.current.ciudades[0].nombre_ciudad).toBe('Retalhuleu 2');
  });

  it('elimina una ciudad de la lista', async () => {
    api.get.mockResolvedValue({ data: [{ id_ciudad: 1, nombre_ciudad: 'Retalhuleu' }] });
    const { result } = renderHook(() => useCiudades());
    await waitFor(() => expect(result.current.cargandoCiudades).toBe(false));

    api.delete.mockResolvedValue({});

    await act(async () => {
      await result.current.eliminar(1);
    });

    expect(api.delete).toHaveBeenCalledWith('/ciudades/1');
    expect(result.current.ciudades).toEqual([]);
  });
});
