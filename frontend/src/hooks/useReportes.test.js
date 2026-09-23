import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  obtenerRentabilidad,
  obtenerMetodosPago,
  obtenerResumenVentas,
  obtenerSerieVentas,
  obtenerTopProductos,
} from '../api/reportes';
import useReportes from './useReportes';

vi.mock('../api/reportes', () => ({
  obtenerRentabilidad: vi.fn(),
  obtenerResumenVentas: vi.fn(),
  obtenerSerieVentas: vi.fn(),
  obtenerMetodosPago: vi.fn(),
  obtenerTopProductos: vi.fn(),
}));

const filtros = {
  id_sucursal: 2,
  fecha_desde: '2026-08-01',
  fecha_hasta: '2026-08-31',
  agrupacion: 'dia',
  criterio: 'cantidad',
  limite: 5,
};

const filtrosComunes = { id_sucursal: 2, fecha_desde: filtros.fecha_desde, fecha_hasta: filtros.fecha_hasta };

const prepararRespuestasExitosas = () => {
  obtenerRentabilidad.mockResolvedValue([{ id_sucursal: 2, ingresos: 500, costo: 300, utilidad: 200, margen: 40 }]);
  obtenerResumenVentas.mockResolvedValue({ ingresos_totales: 500 });
  obtenerSerieVentas.mockResolvedValue([{ periodo: '2026-08-01', ingresos: 500 }]);
  obtenerMetodosPago.mockResolvedValue([{ metodo_pago: 'efectivo', ingresos: 500 }]);
  obtenerTopProductos.mockResolvedValue([{ id_producto: 1, cantidad_vendida: 10 }]);
};

describe('useReportes', () => {
  it('actualiza solo productos al cambiar el criterio sin recargar las otras secciones', async () => {
    const { result, rerender } = renderHook(({ actuales }) => useReportes(actuales), {
      initialProps: { actuales: filtros },
    });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    const resumenAnterior = result.current.resumen;
    const signalResumen = obtenerResumenVentas.mock.calls[0][1].signal;
    let resolver;
    obtenerTopProductos.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

    rerender({ actuales: { ...filtros, criterio: 'ingresos' } });

    expect(result.current.topProductos.cargando).toBe(true);
    expect(result.current.resumen).toBe(resumenAnterior);
    expect(signalResumen.aborted).toBe(false);
    for (const cargar of [obtenerResumenVentas, obtenerSerieVentas, obtenerMetodosPago]) {
      expect(cargar).toHaveBeenCalledTimes(1);
    }
    expect(obtenerTopProductos).toHaveBeenLastCalledWith(
      { ...filtrosComunes, criterio: 'ingresos', limite: 5 }, { signal: expect.any(AbortSignal) },
    );
    await act(async () => { resolver([{ id_producto: 9 }]); });
    expect(result.current.topProductos.datos).toEqual([{ id_producto: 9 }]);
  });

  it('actualiza solo la serie al cambiar la agrupación', async () => {
    const { result, rerender } = renderHook(({ actuales }) => useReportes(actuales), {
      initialProps: { actuales: filtros },
    });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    rerender({ actuales: { ...filtros, agrupacion: 'mes' } });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(obtenerSerieVentas).toHaveBeenCalledTimes(2);
    for (const cargar of [obtenerResumenVentas, obtenerMetodosPago, obtenerTopProductos]) {
      expect(cargar).toHaveBeenCalledTimes(1);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prepararRespuestasExitosas();
  });

  it('carga en paralelo todos los recursos con los mismos filtros', async () => {
    const { result } = renderHook(() => useReportes(filtros));

    expect(result.current.cargando).toBe(true);

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(obtenerResumenVentas).toHaveBeenCalledWith(filtrosComunes, {
      signal: expect.any(AbortSignal),
    });
    expect(obtenerSerieVentas).toHaveBeenCalledWith({ ...filtrosComunes, agrupacion: 'dia' }, {
      signal: expect.any(AbortSignal),
    });
    expect(obtenerMetodosPago).toHaveBeenCalledWith(filtrosComunes, {
      signal: expect.any(AbortSignal),
    });
    expect(obtenerTopProductos).toHaveBeenCalledWith({ ...filtrosComunes, criterio: 'cantidad', limite: 5 }, {
      signal: expect.any(AbortSignal),
    });
    expect(result.current.resumen.datos).toEqual({ ingresos_totales: 500 });
    expect(obtenerRentabilidad).not.toHaveBeenCalled();
    expect(result.current.serie.error).toBeNull();
  });

  it('mantiene disponibles los recursos correctos cuando una sección falla', async () => {
    obtenerTopProductos.mockRejectedValue({
      response: { data: { mensaje: 'No hay ranking disponible.' } },
    });

    const { result } = renderHook(() => useReportes(filtros));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.resumen.datos).toEqual({ ingresos_totales: 500 });
    expect(result.current.resumen.error).toBeNull();
    expect(result.current.topProductos.datos).toEqual([]);
    expect(result.current.topProductos.error).toBe('No hay ranking disponible.');
  });

  it('publica cada recurso sin esperar a que terminen las demás consultas', async () => {
    let resolverTopProductos;
    obtenerTopProductos.mockReturnValue(new Promise((resolve) => {
      resolverTopProductos = resolve;
    }));

    const { result } = renderHook(() => useReportes(filtros));

    await waitFor(() => expect(result.current.resumen.cargando).toBe(false));

    expect(result.current.resumen.datos).toEqual({ ingresos_totales: 500 });
    expect(result.current.topProductos.cargando).toBe(true);
    expect(result.current.cargando).toBe(true);

    await act(async () => {
      resolverTopProductos([]);
    });

    await waitFor(() => expect(result.current.cargando).toBe(false));
  });

  it('permite reintentar la carga sin cambiar los filtros', async () => {
    const { result } = renderHook(() => useReportes(filtros));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.recargar();
    });

    await waitFor(() => expect(obtenerResumenVentas).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.cargando).toBe(false));
  });

  it('cancela las solicitudes anteriores cuando cambian los filtros', async () => {
    const { rerender } = renderHook(
      ({ filtrosActuales }) => useReportes(filtrosActuales),
      { initialProps: { filtrosActuales: filtros } },
    );

    await waitFor(() => expect(obtenerResumenVentas).toHaveBeenCalledTimes(1));
    const primeraSignal = obtenerResumenVentas.mock.calls[0][1].signal;

    rerender({
      filtrosActuales: { ...filtros, id_sucursal: 3, fecha_desde: '2026-08-10' },
    });

    expect(primeraSignal.aborted).toBe(true);
    await waitFor(() => expect(obtenerResumenVentas).toHaveBeenCalledTimes(2));
  });
});
