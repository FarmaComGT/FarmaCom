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

  it('aplica el precio promocional al alcanzar la cantidad mínima', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });
    const producto = {
      id_producto: 1,
      precio_venta: 10,
      promocion: { cantidad_minima: 3, precio_promocion: 7.5 },
    };

    act(() => {
      result.current.agregarAlCarrito(producto, { cantidad: 2 });
    });
    expect(result.current.items[0].promocionAplicada).toBe(false);
    expect(result.current.total).toBe(20);

    act(() => {
      result.current.incrementarCantidad('producto-1');
    });
    expect(result.current.items[0]).toMatchObject({
      promocionAplicada: true,
      promocionDisponible: true,
      precioAplicado: 7.5,
    });
    expect(result.current.total).toBe(22.5);
  });

  it('acumula la cantidad promocional del producto entre lotes seleccionados', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });
    const promocion = { cantidad_minima: 3, precio_promocion: 7.5 };

    act(() => {
      result.current.agregarAlCarrito({
        id_producto: 1,
        id_lote: 10,
        precio_venta: 10,
        promocion,
      }, { cantidad: 1 });
      result.current.agregarAlCarrito({
        id_producto: 1,
        id_lote: 11,
        precio_venta: 11,
        promocion,
      }, { cantidad: 2 });
    });

    expect(result.current.items).toEqual([
      expect.objectContaining({ id_lote: 10, promocionAplicada: true, precioAplicado: 7.5 }),
      expect.objectContaining({ id_lote: 11, promocionAplicada: true, precioAplicado: 7.5 }),
    ]);
    expect(result.current.total).toBe(22.5);
  });

  it('ignora una promoción que ya no sea menor al precio normal', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({
        id_producto: 1,
        precio_venta: 10,
        promocion: { cantidad_minima: 2, precio_promocion: 12 },
      }, { cantidad: 2 });
    });

    expect(result.current.items[0]).toMatchObject({
      promocionAplicada: false,
      promocionDisponible: false,
      precioAplicado: 10,
    });
    expect(result.current.total).toBe(20);
  });

  it('indica si una clave está en el carrito', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });

    expect(result.current.estaEnCarrito('producto-1')).toBe(true);
    expect(result.current.estaEnCarrito('producto-99')).toBe(false);
  });

  it('crea carritos independientes y conserva sus productos al cambiar', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
    });
    act(() => {
      result.current.crearCarrito();
    });

    expect(result.current.carritoActivoId).toBe('carrito-2');
    expect(result.current.items).toEqual([]);

    act(() => {
      result.current.agregarAlCarrito(
        { id_producto: 2, precio_venta: 5 },
        { cantidad: 3 },
      );
    });
    expect(result.current.cantidadTotal).toBe(3);

    act(() => {
      result.current.cambiarCarrito('carrito-1');
    });
    expect(result.current.items).toEqual([
      expect.objectContaining({ clave: 'producto-1', cantidad: 1 }),
    ]);

    act(() => {
      result.current.cambiarCarrito('carrito-2');
    });
    expect(result.current.items).toEqual([
      expect.objectContaining({ clave: 'producto-2', cantidad: 3 }),
    ]);
  });

  it('conserva un cliente diferente en cada carrito', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });
    const clienteMostrador = { id_cliente: 1, nombre_cliente: 'Cliente mostrador' };
    const clienteDomicilio = { id_cliente: 2, nombre_cliente: 'Cliente domicilio' };

    act(() => {
      result.current.seleccionarCliente(clienteMostrador);
      result.current.crearCarrito();
    });
    act(() => {
      result.current.seleccionarCliente(clienteDomicilio);
    });
    expect(result.current.clienteSeleccionado).toEqual(clienteDomicilio);

    act(() => {
      result.current.cambiarCarrito('carrito-1');
    });
    expect(result.current.clienteSeleccionado).toEqual(clienteMostrador);
  });

  it('renombra un carrito, recorta espacios y rechaza nombres vacíos', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });
    let renombrado;
    let rechazado;

    act(() => {
      renombrado = result.current.renombrarCarrito('carrito-1', '  Pedido pendiente  ');
    });
    expect(renombrado).toBe(true);
    expect(result.current.carritoActivo.nombre).toBe('Pedido pendiente');

    act(() => {
      rechazado = result.current.renombrarCarrito('carrito-1', '   ');
    });
    expect(rechazado).toBe(false);
    expect(result.current.carritoActivo.nombre).toBe('Pedido pendiente');
  });

  it('cierra el carrito activo y cambia a uno de los carritos restantes', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
      result.current.crearCarrito();
    });
    act(() => {
      result.current.cerrarCarrito('carrito-2');
    });

    expect(result.current.carritos).toHaveLength(1);
    expect(result.current.carritoActivoId).toBe('carrito-1');
    expect(result.current.items).toEqual([
      expect.objectContaining({ clave: 'producto-1' }),
    ]);
  });

  it('al cerrar el último carrito crea uno nuevo, vacío y sin cliente', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper });

    act(() => {
      result.current.agregarAlCarrito({ id_producto: 1, precio_venta: 10 });
      result.current.seleccionarCliente({ id_cliente: 1, nombre_cliente: 'Cliente' });
    });
    act(() => {
      result.current.cerrarCarrito('carrito-1');
    });

    expect(result.current.carritos).toHaveLength(1);
    expect(result.current.carritoActivoId).toBe('carrito-2');
    expect(result.current.items).toEqual([]);
    expect(result.current.clienteSeleccionado).toBeNull();
  });
});
