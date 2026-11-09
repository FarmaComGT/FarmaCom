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
  it('crea sin vencimiento ni número y permite quitar el vencimiento al editar', () => {
    const formulario = { ...base, numero_lote: '', fecha_vencimiento: '' };
    expect(validarLoteForm(formulario, false)).toBeNull();
    expect(construirPayloadLote(formulario, null)).toEqual(expect.objectContaining({ fecha_vencimiento: null }));
    expect(construirPayloadLote(formulario, null)).not.toHaveProperty('numero_lote');
    const lote = construirPayloadLote(base, null);
    expect(construirPayloadLote({ ...base, fecha_vencimiento: '' }, lote)).toEqual({ version: 1, fecha_vencimiento: null });
    expect(construirPayloadLote({ ...base, fecha_vencimiento: '' }, { ...lote, fecha_vencimiento: null })).toEqual({ version: 1 });
  });
  it('precarga producto y sucursal sin inventar un costo al crear', () => {
    expect(inicializarLoteForm({ lote: null, productoInicialId: 2, sucursalInicialId: 4, productos: [{ id_producto: 2, precio_compra: 10 }] }))
      .toEqual(expect.objectContaining({ id_producto: '2', id_sucursal: '4', precio_compra: '' }));
  });

  it('delega los ajustes de stock y conserva las validaciones de fecha', () => {
    expect(validarLoteForm({ ...base, stock_actual: '21' }, true)).toBeNull();
    expect(validarLoteForm(base, true)).toBeNull();
  });

  it('construye un payload mínimo sin sobrescribir la configuración antigua de mayoreo', () => {
    const lote = {
      id_producto: 2, id_proveedor: 3, id_sucursal: 4, numero_lote: 'LT-1',
      fecha_vencimiento: '2099-12-31', cantidad_ingresada: 20, stock_actual: 12,
      precio_compra: 10, margen_ganancia: 25, precio_venta: 12.5,
      precio_mayoreo: 9, cantidad_mayoreo: 5, version: 4,
    };
    expect(construirPayloadLote(base, lote)).toEqual({ version: 4 });
    expect(construirPayloadLote(base, null)).not.toHaveProperty('precio_mayoreo');
    expect(construirPayloadLote(base, null)).not.toHaveProperty('cantidad_mayoreo');
  });

  it('envía únicamente los cambios de metadatos desde el hook', () => {
    const onSubmit = vi.fn();
    const lote = { id_producto: 2, id_proveedor: 3, id_sucursal: 4, numero_lote: 'LT-1', fecha_vencimiento: '2099-12-31', cantidad_ingresada: 20, stock_actual: 12, precio_compra: 10, margen_ganancia: 25, precio_venta: 12.5 };
    const productos = [{ id_producto: 2, activo: true }];
    const { result } = renderHook(() => useLoteForm({ isOpen: true, productos, lote, onSubmit }));
    act(() => result.current.manejarCambio({ target: { name: 'numero_lote', value: 'LT-2' } }));
    act(() => result.current.manejarEnvio({ preventDefault: vi.fn() }));
    expect(onSubmit).toHaveBeenCalledWith({ version: 1, numero_lote: 'LT-2' });
  });
});
