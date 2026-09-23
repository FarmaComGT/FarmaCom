import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abrirSesion,
  cerrarSesion,
  obtenerCajas,
  obtenerSesionActual,
  registrarMovimiento,
} from '../api/cajas';
import useCaja from './useCaja';

vi.mock('../api/cajas', () => ({
  obtenerCajas: vi.fn(),
  obtenerSesionActual: vi.fn(),
  abrirSesion: vi.fn(),
  registrarMovimiento: vi.fn(),
  cerrarSesion: vi.fn(),
}));

const cajasEjemplo = [
  { id_caja: 3, nombre: 'Caja principal', activa: true },
  { id_caja: 4, nombre: 'Caja auxiliar', activa: true },
];

describe('useCaja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerCajas.mockResolvedValue(cajasEjemplo);
  });

  it('carga las cajas activas de la sucursal', async () => {
    const { result } = renderHook(() => useCaja(2));

    expect(result.current.cargandoCajas).toBe(true);

    await waitFor(() => expect(result.current.cargandoCajas).toBe(false));

    expect(obtenerCajas).toHaveBeenCalledWith(
      { id_sucursal: 2, activa: true },
      { signal: expect.any(AbortSignal) },
    );
    expect(result.current.cajas).toEqual(cajasEjemplo);
    expect(result.current.error).toBeNull();
  });

  it('consulta la sesión al seleccionar una caja', async () => {
    const sesion = { id_sesion_caja: 9, id_caja: 3, estado: 'abierta' };
    obtenerSesionActual.mockResolvedValue(sesion);
    const { result } = renderHook(() => useCaja(2));
    await waitFor(() => expect(result.current.cargandoCajas).toBe(false));

    act(() => result.current.seleccionarCaja(3));

    await waitFor(() => expect(result.current.cargandoSesion).toBe(false));

    expect(obtenerSesionActual).toHaveBeenCalledWith(3, {
      signal: expect.any(AbortSignal),
    });
    expect(result.current.cajaSeleccionada).toEqual(cajasEjemplo[0]);
    expect(result.current.sesionActual).toEqual(sesion);
  });

  it('interpreta un 404 como una caja sin sesión abierta', async () => {
    obtenerSesionActual.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useCaja(2));
    await waitFor(() => expect(result.current.cargandoCajas).toBe(false));

    act(() => result.current.seleccionarCaja(3));

    await waitFor(() => expect(result.current.cargandoSesion).toBe(false));

    expect(result.current.sesionActual).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('abre una sesión y actualiza la caja seleccionada', async () => {
    obtenerSesionActual.mockRejectedValue({ response: { status: 404 } });
    const sesion = {
      id_sesion_caja: 9,
      id_caja: 3,
      turno: 'mañana',
      fecha_hora_apertura: '2026-09-22T08:00:00.000Z',
    };
    abrirSesion.mockResolvedValue(sesion);
    const { result } = renderHook(() => useCaja(2));
    await waitFor(() => expect(result.current.cargandoCajas).toBe(false));
    act(() => result.current.seleccionarCaja(3));
    await waitFor(() => expect(result.current.cargandoSesion).toBe(false));

    await act(async () => {
      await result.current.abrir({ turno: 'mañana', fondo_inicial: '250.00' });
    });

    expect(abrirSesion).toHaveBeenCalledWith(3, {
      turno: 'mañana',
      fondo_inicial: '250.00',
    });
    expect(result.current.sesionActual).toEqual(sesion);
    expect(result.current.cajaSeleccionada.id_sesion_abierta).toBe(9);
  });

  it('registra un movimiento en la sesión abierta', async () => {
    const sesion = { id_sesion_caja: 9, id_caja: 3, estado: 'abierta' };
    const movimiento = { id_movimiento_caja: 12, tipo: 'entrada', monto: '50.00' };
    obtenerSesionActual.mockResolvedValue(sesion);
    registrarMovimiento.mockResolvedValue(movimiento);
    const { result } = renderHook(() => useCaja(2));
    await waitFor(() => expect(result.current.cargandoCajas).toBe(false));
    act(() => result.current.seleccionarCaja(3));
    await waitFor(() => expect(result.current.sesionActual).toEqual(sesion));

    let resultado;
    await act(async () => {
      resultado = await result.current.registrar({
        tipo: 'entrada',
        monto: '50.00',
        motivo: 'Cambio adicional',
      });
    });

    expect(registrarMovimiento).toHaveBeenCalledWith(9, {
      tipo: 'entrada',
      monto: '50.00',
      motivo: 'Cambio adicional',
    });
    expect(resultado).toEqual(movimiento);
  });

  it('cierra la sesión y libera la caja', async () => {
    const sesion = { id_sesion_caja: 9, id_caja: 3, estado: 'abierta' };
    const cierre = { ...sesion, estado: 'cerrada', resultado: 'cuadrada' };
    obtenerSesionActual.mockResolvedValue(sesion);
    cerrarSesion.mockResolvedValue(cierre);
    const { result } = renderHook(() => useCaja(2));
    await waitFor(() => expect(result.current.cargandoCajas).toBe(false));
    act(() => result.current.seleccionarCaja(3));
    await waitFor(() => expect(result.current.sesionActual).toEqual(sesion));

    let resultado;
    await act(async () => {
      resultado = await result.current.cerrar({ efectivo_contado: '300.00' });
    });

    expect(cerrarSesion).toHaveBeenCalledWith(9, { efectivo_contado: '300.00' });
    expect(resultado).toEqual(cierre);
    expect(result.current.sesionActual).toBeNull();
    expect(result.current.cajaSeleccionada.id_sesion_abierta).toBeNull();
  });

  it('expone el mensaje del backend cuando una operación falla', async () => {
    obtenerSesionActual.mockResolvedValue({
      id_sesion_caja: 9,
      id_caja: 3,
      estado: 'abierta',
    });
    registrarMovimiento.mockRejectedValue({
      response: {
        data: { mensaje: 'La salida supera el efectivo disponible.' },
      },
    });
    const { result } = renderHook(() => useCaja(2));
    await waitFor(() => expect(result.current.cargandoCajas).toBe(false));
    act(() => result.current.seleccionarCaja(3));
    await waitFor(() => expect(result.current.sesionActual).not.toBeNull());

    await act(async () => {
      await expect(result.current.registrar({
        tipo: 'salida',
        monto: '500.00',
        motivo: 'Retiro',
      })).rejects.toThrow('La salida supera el efectivo disponible.');
    });

    expect(result.current.error).toBe('La salida supera el efectivo disponible.');
    expect(result.current.procesando).toBe(false);
  });
});
