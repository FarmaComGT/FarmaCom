import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useSeleccionCajaVenta from './useSeleccionCajaVenta.js';

describe('useSeleccionCajaVenta', () => {
  it('selecciona automáticamente la única caja con turno abierto', () => {
    const seleccionarCaja = vi.fn();
    renderHook(() => useSeleccionCajaVenta({
      cajas: [{ id_caja: 3, id_sesion_abierta: 8 }], idCajaSeleccionada: null,
      cajaSeleccionada: null, sesionActual: null, cargandoCajas: false,
      cargandoSesion: false, seleccionarCaja,
    }));
    expect(seleccionarCaja).toHaveBeenCalledWith(3);
  });

  it('expone si la venta puede iniciar y describe el turno', () => {
    const { result } = renderHook(() => useSeleccionCajaVenta({
      cajas: [], idCajaSeleccionada: 3, cajaSeleccionada: { id_caja: 3 },
      sesionActual: { id_sesion_caja: 8, turno: 'mañana' }, cargandoCajas: false,
      cargandoSesion: false, seleccionarCaja: vi.fn(),
    }));
    expect(result.current.puedeIniciarVenta).toBe(true);
    expect(result.current.estadoTurno).toBe('Turno mañana activo');
  });
});
