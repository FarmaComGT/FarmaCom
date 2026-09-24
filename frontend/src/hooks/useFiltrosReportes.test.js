import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useFiltrosReportes from './useFiltrosReportes';

describe('useFiltrosReportes', () => {
  const fechaReferencia = new Date(2026, 8, 3);

  it('cambia el criterio sin aplicar las fechas o la sucursal en edición', () => {
    const { result } = renderHook(() => useFiltrosReportes(fechaReferencia));
    const anteriores = result.current.filtrosAplicados;
    act(() => {
      result.current.actualizarFiltro('id_sucursal', '3');
      result.current.actualizarFiltro('fecha_desde', '2026-08-20');
    });
    act(() => { result.current.cambiarCriterio('ingresos'); });
    expect(result.current.filtrosAplicados).toEqual({ ...anteriores, criterio: 'ingresos' });
    expect(result.current.filtrosEdicion).toMatchObject({
      id_sucursal: '3', fecha_desde: '2026-08-20', criterio: 'ingresos',
    });
  });

  it('mantiene separados los filtros en edición y los aplicados', () => {
    const { result } = renderHook(() => useFiltrosReportes(fechaReferencia));

    act(() => {
      result.current.actualizarFiltro('agrupacion', 'semana');
    });

    expect(result.current.filtrosEdicion.agrupacion).toBe('semana');
    expect(result.current.filtrosAplicados.agrupacion).toBe('dia');

    act(() => {
      expect(result.current.aplicarFiltros()).toBe(true);
    });

    expect(result.current.filtrosAplicados.agrupacion).toBe('semana');
  });

  it('conserva los filtros aplicados cuando el rango es inválido', () => {
    const { result } = renderHook(() => useFiltrosReportes(fechaReferencia));

    act(() => {
      result.current.actualizarFiltro('fecha_desde', '2026-10-01');
    });

    act(() => {
      expect(result.current.aplicarFiltros()).toBe(false);
    });

    expect(result.current.errorFiltros).toBe(
      'La fecha inicial no puede ser posterior a la fecha final.',
    );
    expect(result.current.filtrosAplicados.fecha_desde).toBe('2026-08-05');
  });

  it('aplica un cambio inmediato sin depender de una actualización previa', () => {
    const { result } = renderHook(() => useFiltrosReportes(fechaReferencia));

    act(() => {
      expect(result.current.aplicarFiltros({ criterio: 'ingresos' })).toBe(true);
    });

    expect(result.current.filtrosEdicion.criterio).toBe('ingresos');
    expect(result.current.filtrosAplicados.criterio).toBe('ingresos');
  });

  it('restablece y aplica nuevamente el rango predeterminado', () => {
    const { result } = renderHook(() => useFiltrosReportes(fechaReferencia));

    act(() => {
      result.current.actualizarFiltro('id_sucursal', '3');
      result.current.aplicarFiltros();
      result.current.restablecerFiltros();
    });

    expect(result.current.filtrosEdicion.id_sucursal).toBe('');
    expect(result.current.filtrosAplicados.id_sucursal).toBe('');
    expect(result.current.errorFiltros).toBeNull();
  });
});
