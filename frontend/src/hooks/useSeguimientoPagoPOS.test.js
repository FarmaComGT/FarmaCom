import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerEstadoPagoPOS } from '../api/ventas.js';
import useSeguimientoPagoPOS from './useSeguimientoPagoPOS.js';

vi.mock('../api/ventas.js', () => ({
  obtenerEstadoPagoPOS: vi.fn(),
}));

describe('useSeguimientoPagoPOS', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it('encadena consultas sin superponer una solicitud todavía pendiente', async () => {
    let resolverPrimera;
    obtenerEstadoPagoPOS.mockImplementationOnce(() => new Promise((resolve) => {
      resolverPrimera = resolve;
    })).mockResolvedValue({ estado: 'procesando' });
    const onEstado = vi.fn().mockResolvedValue(true);

    renderHook(() => useSeguimientoPagoPOS({
      activo: true,
      externalId: 'farmacom-pos-1',
      onEstado,
      onError: vi.fn(),
    }));

    expect(obtenerEstadoPagoPOS).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10000);
    expect(obtenerEstadoPagoPOS).toHaveBeenCalledTimes(1);

    await act(async () => resolverPrimera({ estado: 'procesando' }));
    await vi.advanceTimersByTimeAsync(1999);
    expect(obtenerEstadoPagoPOS).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(obtenerEstadoPagoPOS).toHaveBeenCalledTimes(2);
  });

  it('detiene el seguimiento cuando el manejador devuelve false', async () => {
    obtenerEstadoPagoPOS.mockResolvedValue({ estado: 'pagado', id_venta: 22 });
    const onEstado = vi.fn().mockResolvedValue(false);

    renderHook(() => useSeguimientoPagoPOS({
      activo: true,
      externalId: 'farmacom-pos-1',
      onEstado,
      onError: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await vi.advanceTimersByTimeAsync(5000);

    expect(obtenerEstadoPagoPOS).toHaveBeenCalledTimes(1);
  });
});
