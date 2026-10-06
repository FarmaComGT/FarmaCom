import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerHistorialExpediente, obtenerHistorialPreciosProducto } from '../api/historiales';
import useHistorialExpediente from './useHistorialExpediente';
import useHistorialPreciosProducto from './useHistorialPreciosProducto';

vi.mock('../api/historiales', () => ({
  obtenerHistorialExpediente: vi.fn(),
  obtenerHistorialPreciosProducto: vi.fn(),
}));

describe('hooks de historiales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga el historial del expediente', async () => {
    const cambios = [{ id_bitacora: 1 }];
    obtenerHistorialExpediente.mockResolvedValue(cambios);

    const { result } = renderHook(() => useHistorialExpediente(7));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.historial).toEqual(cambios);
    expect(obtenerHistorialExpediente).toHaveBeenCalledWith(7);
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
