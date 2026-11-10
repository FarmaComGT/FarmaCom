import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerHistorialPreciosProducto } from '../api/historiales';
import useHistorialPreciosProducto from './useHistorialPreciosProducto';

vi.mock('../api/historiales', () => ({
  obtenerHistorialPreciosProducto: vi.fn(),
}));

describe('hooks de historiales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no consulta precios mientras la vista está cerrada', () => {
    renderHook(() => useHistorialPreciosProducto(4, { enabled: false }));
    expect(obtenerHistorialPreciosProducto).not.toHaveBeenCalled();
  });

  it('expone el error al consultar el historial de precios', async () => {
    obtenerHistorialPreciosProducto.mockRejectedValue({
      response: { data: { mensaje: 'Acceso denegado' } },
    });

    const { result } = renderHook(() => useHistorialPreciosProducto(4));

    await waitFor(() => expect(result.current.error).toBe('Acceso denegado'));
    expect(result.current.historial).toEqual([]);
  });
});
