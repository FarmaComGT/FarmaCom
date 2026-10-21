import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useGestionLotesProducto from './useGestionLotesProducto.js';

const preparar = () => {
  const dependencias = {
    crearLote: vi.fn().mockResolvedValue({}),
    actualizarLote: vi.fn().mockResolvedValue({}),
    eliminarLote: vi.fn().mockResolvedValue({}),
    limpiarError: vi.fn(),
    onCambio: vi.fn().mockResolvedValue(undefined),
    onExito: vi.fn(),
  };
  return {
    dependencias,
    ...renderHook(() => useGestionLotesProducto(dependencias)),
  };
};

describe('useGestionLotesProducto', () => {
  it('crea un lote y solicita actualizar el listado', async () => {
    const { result, dependencias } = preparar();
    act(() => result.current.abrirNuevo());

    await act(() => result.current.guardar({ numero_lote: 'LT-001' }));

    expect(dependencias.crearLote).toHaveBeenCalledWith({ numero_lote: 'LT-001' });
    expect(dependencias.onCambio).toHaveBeenCalledOnce();
    expect(result.current.mostrarFormulario).toBe(false);
    expect(result.current.refreshKey).toBe(1);
  });

  it('actualiza el lote seleccionado', async () => {
    const { result, dependencias } = preparar();
    act(() => result.current.abrirEdicion({ id_lote: 9 }));

    await act(() => result.current.guardar({ numero_lote: 'LT-009' }));

    expect(dependencias.actualizarLote).toHaveBeenCalledWith(9, { numero_lote: 'LT-009' });
  });

  it('elimina el lote después de confirmarlo', async () => {
    const { result, dependencias } = preparar();
    act(() => result.current.solicitarEliminacion({ id_lote: 4, numero_lote: 'LT-004' }));

    await act(() => result.current.confirmarEliminacion());

    expect(dependencias.eliminarLote).toHaveBeenCalledWith(4);
    expect(result.current.loteAEliminar).toBeNull();
  });
});
