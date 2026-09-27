import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarLaboratorios } from '../api/laboratorios';
import useLaboratorios from './useLaboratorios';

vi.mock('../api/laboratorios', () => ({
  listarLaboratorios: vi.fn(),
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
});
