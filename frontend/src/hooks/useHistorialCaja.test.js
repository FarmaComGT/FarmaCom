import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerCierres } from '../api/cajas';
import useHistorialCaja from './useHistorialCaja';

vi.mock('../api/cajas', () => ({
  obtenerCierres: vi.fn(),
}));

const filtros = {
  id_sucursal: 2,
  id_caja: 3,
  fecha_desde: '2026-09-01',
  fecha_hasta: '2026-09-28',
};

describe('useHistorialCaja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerCierres.mockResolvedValue([{ id_sesion_caja: 9 }]);
  });

  it('carga los cierres con los filtros aplicados', async () => {
    const { result } = renderHook(() => useHistorialCaja(filtros));

    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(obtenerCierres).toHaveBeenCalledWith(filtros, {
      signal: expect.any(AbortSignal),
    });
    expect(result.current.cierres).toEqual([{ id_sesion_caja: 9 }]);
  });

  it('expone el mensaje enviado por el backend', async () => {
    obtenerCierres.mockRejectedValue({
      response: { data: { mensaje: 'No fue posible consultar los cierres.' } },
    });

    const { result } = renderHook(() => useHistorialCaja(filtros));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.cierres).toEqual([]);
    expect(result.current.error).toBe('No fue posible consultar los cierres.');
  });

  it('permite recargar sin modificar los filtros', async () => {
    const { result } = renderHook(() => useHistorialCaja(filtros));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.recargar());

    await waitFor(() => expect(obtenerCierres).toHaveBeenCalledTimes(2));
  });
});
