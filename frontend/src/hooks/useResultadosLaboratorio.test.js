import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anularResultado, listarResultados, subirResultado } from '../api/resultadosLaboratorio';
import useResultadosLaboratorio from './useResultadosLaboratorio';

vi.mock('../api/resultadosLaboratorio', () => ({
  listarResultados: vi.fn(),
  subirResultado: vi.fn(),
  anularResultado: vi.fn(),
}));

describe('useResultadosLaboratorio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta nada sin id de paciente', () => {
    renderHook(() => useResultadosLaboratorio(null));

    expect(listarResultados).not.toHaveBeenCalled();
  });

  it('carga los resultados del paciente', async () => {
    listarResultados.mockResolvedValue([{ id_resultado: 1 }]);

    const { result } = renderHook(() => useResultadosLaboratorio(5));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.resultados).toEqual([{ id_resultado: 1 }]);
  });

  it('expone el error del backend si falla la carga', async () => {
    listarResultados.mockRejectedValue({ response: { data: { mensaje: 'Fallo' } } });

    const { result } = renderHook(() => useResultadosLaboratorio(5));

    await waitFor(() => expect(result.current.error).toBe('Fallo'));
  });

  it('sube un resultado y refresca la lista', async () => {
    listarResultados.mockResolvedValue([]);
    const { result } = renderHook(() => useResultadosLaboratorio(5));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    subirResultado.mockResolvedValue({ id_resultado: 1 });

    await act(async () => {
      await result.current.subir({ categoria: 'Hematología', archivo: {} });
    });

    expect(subirResultado).toHaveBeenCalledWith({
      idPaciente: 5, categoria: 'Hematología', archivo: {},
    });
    expect(listarResultados).toHaveBeenCalledTimes(2);
  });

  it('traduce el error al subir un resultado', async () => {
    listarResultados.mockResolvedValue([]);
    const { result } = renderHook(() => useResultadosLaboratorio(5));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    subirResultado.mockRejectedValue({ response: { data: { mensaje: 'Archivo inválido' } } });

    await expect(result.current.subir({ categoria: 'X', archivo: {} })).rejects.toThrow(
      'Archivo inválido',
    );
  });

  it('anula un resultado y refresca la lista', async () => {
    listarResultados.mockResolvedValue([]);
    const { result } = renderHook(() => useResultadosLaboratorio(5));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    anularResultado.mockResolvedValue({ id_resultado: 1, estado: 'anulado' });

    await act(async () => {
      await result.current.anular(1, 'Error de carga');
    });

    expect(anularResultado).toHaveBeenCalledWith(1, 'Error de carga');
  });
});
