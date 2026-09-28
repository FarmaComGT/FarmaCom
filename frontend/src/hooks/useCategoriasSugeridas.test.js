import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerCategoriasSugeridas } from '../api/resultadosLaboratorio';
import useCategoriasSugeridas from './useCategoriasSugeridas';

vi.mock('../api/resultadosLaboratorio', () => ({
  obtenerCategoriasSugeridas: vi.fn(),
}));

describe('useCategoriasSugeridas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta nada sin un laboratorio seleccionado', () => {
    const { result } = renderHook(() => useCategoriasSugeridas(null));

    expect(result.current).toEqual([]);
    expect(obtenerCategoriasSugeridas).not.toHaveBeenCalled();
  });

  it('carga las categorías sugeridas del laboratorio', async () => {
    obtenerCategoriasSugeridas.mockResolvedValue(['Hematología', 'Orina']);

    const { result } = renderHook(() => useCategoriasSugeridas(3));

    await waitFor(() => expect(result.current).toEqual(['Hematología', 'Orina']));
    expect(obtenerCategoriasSugeridas).toHaveBeenCalledWith(3);
  });

  it('se queda vacío en silencio si la consulta falla', async () => {
    obtenerCategoriasSugeridas.mockRejectedValue(new Error('red caída'));

    const { result } = renderHook(() => useCategoriasSugeridas(3));

    await waitFor(() => expect(obtenerCategoriasSugeridas).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
