import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CarritoProvider, useCarrito } from './CarritoContext';

const wrapper = ({ children }) => <CarritoProvider>{children}</CarritoProvider>;

describe('CarritoContext', () => {
  it('lanza un error si se usa fuera del provider', () => {
    const { result } = renderHook(() => {
      try {
        return useCarrito();
      } catch (error) {
        return error;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
    expect(result.current.message).toBe('useCarrito debe usarse dentro de <CarritoProvider>.');
  });

  it('inicia vacío', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.cantidadTotal).toBe(0);
    expect(result.current.subtotal).toBe(0);
  });

  it('agrega un producto nuevo usando id_producto como clave', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });

    expect(result.current.items).toEqual([
      expect.objectContaining({ clave: 'producto-1', cantidad: 1, precioUnitario: 10 }),
    ]);
    expect(result.current.cantidadTotal).toBe(1);
    expect(result.current.subtotal).toBe(10);
  });

  it('usa id_lote como clave cuando está presente', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_lote: 5, id_producto: 1, precio: 20 });
    });

    expect(result.current.items[0].clave).toBe('lote-5');
  });

  it('usa carritoKey cuando está presente', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ carritoKey: 'especial-1', precio_venta: 5 });
    });

    expect(result.current.items[0].clave).toBe('especial-1');
  });

  it('lanza un error si el producto no tiene id_producto, id_lote ni carritoKey', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    expect(() => {
      act(() => {
        result.current.agregarAlCarrito({ precio_venta: 5 });
      });
    }).toThrow('El producto debe incluir id_producto o una carritoKey.');
  });

  it('suma la cantidad cuando el producto ya está en el carrito', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });
    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 }, { cantidad: 2 });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].cantidad).toBe(3);
  });

  it('usa precioUnitario explícito en vez del precio del producto', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 }, { precioUnitario: 7 });
    });

    expect(result.current.items[0].precioUnitario).toBe(7);
  });

  it('normaliza cantidades inválidas al valor por defecto (1)', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 }, { cantidad: -5 });
    });

    expect(result.current.items[0].cantidad).toBe(1);
  });

  it('nunca deja el precio en negativo', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: -10 });
    });

    expect(result.current.items[0].precioUnitario).toBe(0);
  });

  it('actualiza la cantidad de un item existente', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });
    act(() => {
      result.current.actualizarCantidad('producto-1', 5);
    });

    expect(result.current.items[0].cantidad).toBe(5);
  });

  it('elimina el item cuando la cantidad baja a 0 o menos', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });
    act(() => {
      result.current.actualizarCantidad('producto-1', 0);
    });

    expect(result.current.items).toEqual([]);
  });

  it('ignora cantidades no numéricas al actualizar', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });
    act(() => {
      result.current.actualizarCantidad('producto-1', 'no-es-numero');
    });

    expect(result.current.items[0].cantidad).toBe(1);
  });

  it('incrementa y disminuye la cantidad de un item', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });
    act(() => {
      result.current.incrementarCantidad('producto-1');
    });
    expect(result.current.items[0].cantidad).toBe(2);

    act(() => {
      result.current.disminuirCantidad('producto-1');
    });
    expect(result.current.items[0].cantidad).toBe(1);
  });

  it('no hace nada al incrementar/disminuir un item que no existe', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.incrementarCantidad('no-existe');
      result.current.disminuirCantidad('no-existe');
    });

    expect(result.current.items).toEqual([]);
  });

  it('elimina un item del carrito', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });
    act(() => {
      result.current.eliminarDelCarrito('producto-1');
    });

    expect(result.current.items).toEqual([]);
  });

  it('vacía el carrito completo', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
      result.current.agregarAlCarrito({ id_producto: 2, precio_venta: 20 });
    });
    act(() => {
      result.current.vaciarCarrito();
    });

    expect(result.current.items).toEqual([]);
  });

  it('calcula el subtotal y la cantidad total con varios items', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 }, { cantidad: 2 });
      result.current.agregarAlCarrito({ id_producto: 2, precio_venta: 5 }, { cantidad: 3 });
    });

    expect(result.current.cantidadTotal).toBe(5);
    expect(result.current.subtotal).toBe(35);
    expect(result.current.total).toBe(35);
  });

  it('indica si una clave está en el carrito', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });

    expect(result.current.estaEnCarrito('producto-1')).toBe(true);
    expect(result.current.estaEnCarrito('producto-99')).toBe(false);
  });
});
