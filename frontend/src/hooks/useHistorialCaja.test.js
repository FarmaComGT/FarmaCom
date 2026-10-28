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

  it.each([
    [{ response: { data: { errores: [{ msg: 'Filtros inválidos.' }] } } }, 'Filtros inválidos.'],
    [new Error('Error de red.'), 'Error de red.'],
    [{}, 'No se pudo cargar el historial de cierres.'],
  ])('selecciona el mensaje alternativo de error', async (errorSolicitud, mensaje) => {
    obtenerCierres.mockRejectedValue(errorSolicitud);

    const { result } = renderHook(() => useHistorialCaja(filtros));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.error).toBe(mensaje);
  });

  it('consulta sin filtros usando valores vacíos', async () => {
    const { result } = renderHook(() => useHistorialCaja());

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(obtenerCierres).toHaveBeenCalledWith({
      id_sucursal: '',
      id_caja: '',
      fecha_desde: '',
      fecha_hasta: '',
    }, { signal: expect.any(AbortSignal) });
  });

  it('permite recargar sin modificar los filtros', async () => {
    const { result } = renderHook(() => useHistorialCaja(filtros));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.recargar());

    await waitFor(() => expect(obtenerCierres).toHaveBeenCalledTimes(2));
  });

  it('cancela la consulta anterior al cambiar los filtros', () => {
    obtenerCierres.mockImplementation(() => new Promise(() => {}));
    const { rerender } = renderHook(
      ({ valores }) => useHistorialCaja(valores),
      { initialProps: { valores: filtros } },
    );
    const primeraSenal = obtenerCierres.mock.calls[0][1].signal;

    rerender({ valores: { ...filtros, id_caja: 4 } });

    expect(primeraSenal.aborted).toBe(true);
    expect(obtenerCierres).toHaveBeenCalledTimes(2);
  });

  it('ignora una respuesta que llega después de desmontar el hook', async () => {
    let resolver;
    obtenerCierres.mockImplementation(() => new Promise((resolve) => {
      resolver = resolve;
    }));
    const { unmount } = renderHook(() => useHistorialCaja(filtros));

    unmount();
    await act(async () => {
      resolver([{ id_sesion_caja: 10 }]);
    });

    expect(obtenerCierres.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('ignora un error que llega después de desmontar el hook', async () => {
    let rechazar;
    obtenerCierres.mockImplementation(() => new Promise((_resolve, reject) => {
      rechazar = reject;
    }));
    const { unmount } = renderHook(() => useHistorialCaja(filtros));

    unmount();
    await act(async () => {
      rechazar(new Error('Respuesta tardía'));
    });

    expect(obtenerCierres.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
