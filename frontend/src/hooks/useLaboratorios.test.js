import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actualizarLaboratorio, crearLaboratorio, listarLaboratorios } from '../api/laboratorios';
import useLaboratorios from './useLaboratorios';

vi.mock('../api/laboratorios', () => ({
  listarLaboratorios: vi.fn(),
  crearLaboratorio: vi.fn(),
  actualizarLaboratorio: vi.fn(),
}));

describe('useLaboratorios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga los laboratorios al montar', async () => {
    listarLaboratorios.mockResolvedValue([{ id_laboratorio: 1, nombre_laboratorio: 'Central' }]);

    const { result } = renderHook(() => useLaboratorios());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.laboratorios).toEqual([{ id_laboratorio: 1, nombre_laboratorio: 'Central' }]);
  });

  it('no consulta nada si se pide omitir', () => {
    renderHook(() => useLaboratorios({ omitir: true }));

    expect(listarLaboratorios).not.toHaveBeenCalled();
  });

  it('expone el error del backend si falla la carga', async () => {
    listarLaboratorios.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useLaboratorios());

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('crea un laboratorio y actualiza la lista', async () => {
    listarLaboratorios.mockResolvedValue([]);
    crearLaboratorio.mockResolvedValue({ id_laboratorio: 2, nombre_laboratorio: 'Central' });
    const { result } = renderHook(() => useLaboratorios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => result.current.crear({ nombre_laboratorio: 'Central' }));

    expect(result.current.laboratorios).toEqual([{ id_laboratorio: 2, nombre_laboratorio: 'Central' }]);
  });

  it('edita un laboratorio y conserva el orden por nombre', async () => {
    listarLaboratorios.mockResolvedValue([
      { id_laboratorio: 1, nombre_laboratorio: 'Central' },
      { id_laboratorio: 2, nombre_laboratorio: 'Norte' },
    ]);
    actualizarLaboratorio.mockResolvedValue({ id_laboratorio: 2, nombre_laboratorio: 'Abastos' });
    const { result } = renderHook(() => useLaboratorios());
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => result.current.actualizar(2, { nombre_laboratorio: 'Abastos' }));

    expect(result.current.laboratorios.map((item) => item.nombre_laboratorio)).toEqual(['Abastos', 'Central']);
  });
});
