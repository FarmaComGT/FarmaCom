import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useProductoForm, {
  construirPayloadProducto,
  inicializarProductoForm,
  validarProductoForm,
} from './useProductoForm.js';

const formularioValido = {
  nombre_comercial: ' Paracetamol ',
  nombre_generico: ' Acetaminofén ',
  concentracion: '',
  id_presentacion: '2',
  id_categoria: '3',
  id_casa: '4',
  id_proveedor: '',
  precio_compra: '12.50',
  stock_minimo: '5',
  meses_alerta_vencimiento: '6',
  aplica_mayoreo: false,
  activo: true,
};

describe('useProductoForm', () => {
  it('preserva los ceros del código comercial y permite quitarlo', () => {
    expect(inicializarProductoForm({ codigo_barras: '000123' }).codigo_barras).toBe('000123');
    const payload = (valor) => construirPayloadProducto({
      formulario: { ...formularioValido, codigo_barras: valor },
      codigoSugerido: 'MED010', presentaciones: [{ id_presentacion: 2, nombre: 'Tableta' }],
    });
    expect(payload(' 000123 ').codigo_barras).toBe('000123');
    expect(payload('').codigo_barras).toBeNull();
    expect(validarProductoForm({ ...formularioValido, codigo_barras: 'ABC DEF' })).toContain('código de barras');
  });
  it('inicializa todos los campos en modo edición', () => {
    expect(inicializarProductoForm({
      nombre_comercial: 'Aspirina', id_presentacion: 2, id_categoria: 3, id_casa: 4,
      precio_compra: 8.5, stock_minimo: 0, meses_alerta_vencimiento: 6,
      aplica_mayoreo: true, activo: false,
    })).toEqual(expect.objectContaining({
      nombre_comercial: 'Aspirina', id_presentacion: '2',
      stock_minimo: '0',
    }));
  });

  it('valida campos requeridos y reglas numéricas', () => {
    expect(validarProductoForm({ ...formularioValido, nombre_comercial: ' ' })).toBe('El nombre comercial es requerido.');
    expect(validarProductoForm({ ...formularioValido, meses_alerta_vencimiento: '0' })).toBe('Los meses de alerta deben ser mayores a 0.');
    expect(validarProductoForm(formularioValido)).toBeNull();
  });

  it('construye el payload normalizado para crear', () => {
    expect(construirPayloadProducto({
      formulario: formularioValido,
      producto: null,
      codigoSugerido: 'MED010',
      presentaciones: [{ id_presentacion: 2, nombre: 'Tableta' }],
    })).toEqual({
      codigo: 'MED010-TA', codigo_barras: null, nombre_comercial: 'Paracetamol', nombre_generico: 'Acetaminofén',
      concentracion: null, id_presentacion: 2, id_categoria: 3, id_casa: 4,
      stock_minimo: 5,
      meses_alerta_vencimiento: 6,
    });
  });

  it('conserva el código existente al editar y envía el payload', () => {
    const onSubmit = vi.fn();
    const producto = { codigo: 'MED001-CA', ...formularioValido };
    const { result } = renderHook(() => useProductoForm({
      isOpen: true, modoEdicion: true, producto, codigoSugerido: 'MED099',
      presentaciones: [{ id_presentacion: 2, nombre: 'Caja' }], onSubmit,
    }));

    act(() => result.current.manejarEnvio({ preventDefault: vi.fn() }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'MED001-CA', id_presentacion: 2 }));
  });
});
