import { describe, expect, it } from 'vitest';
import { normalizarCantidadCarrito, validarProductoAgregable } from './carritoVenta.js';

describe('reglas de existencias del carrito', () => {
  it('impide agregar más unidades que las disponibles', () => {
    expect(validarProductoAgregable([{ clave: 'lote-1', cantidad: 2 }], {
      carritoKey: 'lote-1', stock_disponible: 2, nombre_comercial: 'Aspirina',
    })).toBe('No hay más existencias disponibles de Aspirina.');
  });
  it('normaliza cantidades decimales y limita por stock', () => {
    expect(normalizarCantidadCarrito('8.9', 5)).toEqual({
      cantidad: 5, aviso: 'Solo hay 5 unidades disponibles en este lote.',
    });
    expect(normalizarCantidadCarrito('abc', 5)).toEqual({
      cantidad: null, aviso: 'Ingresa una cantidad válida.',
    });
  });
});
