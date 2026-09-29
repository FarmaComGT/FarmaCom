import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerResumenDiario } from '../api/cajas';
import useResumenCaja from './useResumenCaja';

vi.mock('../api/cajas', () => ({ obtenerResumenDiario: vi.fn() }));

describe('useResumenCaja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerResumenDiario.mockResolvedValue([{ id_sucursal: 2 }]);
  });

  it('consulta el resumen para la fecha y sucursal elegidas', async () => {
    const { result } = renderHook(() => useResumenCaja('2026-09-28', 2, 3));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(obtenerResumenDiario).toHaveBeenCalledWith(
      { fecha: '2026-09-28', id_sucursal: 2, id_caja: 3 },
      { signal: expect.any(AbortSignal) },
    );
    expect(result.current.resumen).toEqual([{ id_sucursal: 2 }]);
  });

  it('no consulta la API cuando no existe una fecha', () => {
    const { result } = renderHook(() => useResumenCaja('', 2));

    expect(result.current.cargando).toBe(false);
    expect(result.current.resumen).toEqual([]);
    expect(obtenerResumenDiario).not.toHaveBeenCalled();
  });

  it('no consulta la API mientras no se elija una sucursal', () => {
    const { result } = renderHook(() => useResumenCaja('2026-09-28'));

    expect(result.current.cargando).toBe(false);
    expect(result.current.resumen).toEqual([]);
    expect(obtenerResumenDiario).not.toHaveBeenCalled();
  });

  it('expone el mensaje enviado por el backend', async () => {
    obtenerResumenDiario.mockRejectedValue({
      response: { data: { mensaje: 'No se pudo cargar el resumen diario.' } },
    });
    const { result } = renderHook(() => useResumenCaja('2026-09-28', 2));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.resumen).toEqual([]);
    expect(result.current.error).toBe('No se pudo cargar el resumen diario.');
  });

  it('cancela la consulta anterior al cambiar la fecha', async () => {
    obtenerResumenDiario.mockImplementation(() => new Promise(() => {}));
    const { rerender } = renderHook(
      ({ fecha }) => useResumenCaja(fecha, 2, ''),
      { initialProps: { fecha: '2026-09-27' } },
    );
    const primeraSenal = obtenerResumenDiario.mock.calls[0][1].signal;

    rerender({ fecha: '2026-09-28' });

    expect(primeraSenal.aborted).toBe(true);
    expect(obtenerResumenDiario).toHaveBeenCalledTimes(2);
  });
});
