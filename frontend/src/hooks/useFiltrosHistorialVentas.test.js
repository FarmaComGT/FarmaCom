import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useFiltrosHistorialVentas from './useFiltrosHistorialVentas';

describe('useFiltrosHistorialVentas', () => {
  const fechaReferencia = new Date(2026, 9, 10);

  it('separa los filtros en edición de los aplicados', () => {
    const { result } = renderHook(() => useFiltrosHistorialVentas(fechaReferencia));
    act(() => result.current.actualizarFiltro('id_sucursal', '3'));
    expect(result.current.filtrosEdicion.id_sucursal).toBe('3');
    expect(result.current.filtrosAplicados.id_sucursal).toBe('');
    act(() => expect(result.current.aplicarFiltros()).toBe(true));
    expect(result.current.filtrosAplicados.id_sucursal).toBe(3);
  });

  it('no aplica un rango inválido', () => {
    const { result } = renderHook(() => useFiltrosHistorialVentas(fechaReferencia));
    act(() => result.current.actualizarFiltro('fecha_desde', '2026-10-11'));
    act(() => expect(result.current.aplicarFiltros()).toBe(false));
    expect(result.current.errorFiltros).toBe(
      'La fecha inicial no puede ser posterior a la fecha final.',
    );
  });
});
