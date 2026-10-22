import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useLoteForm, { construirPayloadLote, inicializarLoteForm, validarLoteForm } from './useLoteForm.js';

const base = {
  id_producto: '2', id_proveedor: '3', id_sucursal: '4', numero_lote: ' LT-1 ',
  fecha_vencimiento: '2099-12-31', cantidad_ingresada: '20', stock_actual: '12',
  precio_compra: '10', margen_ganancia: '25', precio_venta: '12.5',
  precio_mayoreo: '', cantidad_mayoreo: '',
};

describe('useLoteForm', () => {
  it('precarga producto, sucursal y precio sugerido al crear', () => {
    expect(inicializarLoteForm({ lote: null, productoInicialId: 2, sucursalInicialId: 4, productos: [{ id_producto: 2, precio_compra: 10 }] }))
      .toEqual(expect.objectContaining({ id_producto: '2', id_sucursal: '4', precio_compra: '10' }));
  });
  it('conserva las validaciones de stock, fecha y mayoreo', () => {
    expect(validarLoteForm({ ...base, stock_actual: '21' }, true)).toBe('El stock actual no puede superar la cantidad ingresada.');
    expect(validarLoteForm({ ...base, precio_mayoreo: '9' }, true)).toBe('Completa precio y cantidad de mayoreo, o deja ambos vacíos.');
    expect(validarLoteForm(base, true)).toBeNull();
  });
  it('construye el payload de edición y permite limpiar mayoreo', () => {
    expect(construirPayloadLote(base, { precio_mayoreo: 9 })).toEqual(expect.objectContaining({
      numero_lote: 'LT-1', stock_actual: 12, precio_mayoreo: null, limpiar_mayoreo: true,
    }));
  });
  it('envía el payload validado desde el hook', () => {
    const onSubmit = vi.fn();
    const lote = { id_producto: 2, id_proveedor: 3, id_sucursal: 4, numero_lote: 'LT-1', fecha_vencimiento: '2099-12-31', cantidad_ingresada: 20, stock_actual: 12, precio_compra: 10, margen_ganancia: 25, precio_venta: 12.5 };
    const productos = [{ id_producto: 2, activo: true }];
    const { result } = renderHook(() => useLoteForm({ isOpen: true, productos, lote, onSubmit }));
    act(() => result.current.manejarEnvio({ preventDefault: vi.fn() }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id_producto: 2, stock_actual: 12 }));
  });
});
