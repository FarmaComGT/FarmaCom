import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

const CarritoContext = createContext(null);

const ACCIONES = {
  AGREGAR: 'AGREGAR',
  ACTUALIZAR_CANTIDAD: 'ACTUALIZAR_CANTIDAD',
  ELIMINAR: 'ELIMINAR',
  VACIAR: 'VACIAR',
};

function numeroPositivo(valor, predeterminado = 1) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : predeterminado;
}

function obtenerClave(producto) {
  if (producto.carritoKey) return String(producto.carritoKey);
  if (producto.id_lote) return `lote-${producto.id_lote}`;
  if (producto.id_producto) return `producto-${producto.id_producto}`;
  throw new Error('El producto debe incluir id_producto o una carritoKey.');
}

function obtenerPrecio(producto, precioUnitario) {
  const precio = precioUnitario ?? producto.precio_venta ?? producto.precio ?? 0;
  return Math.max(0, Number(precio) || 0);
}

export function calcularPrecioAplicado(item, cantidadProducto = item.cantidad) {
  const minimo = Number(item.promocion?.cantidad_minima);
  const precioPromocional = Number(item.promocion?.precio_promocion);
  const promocionDisponible = Number.isFinite(minimo)
    && minimo > 0
    && Number.isFinite(precioPromocional)
    && precioPromocional > 0
    && precioPromocional < item.precioUnitario;
  const aplicaPromocion = promocionDisponible && cantidadProducto >= minimo;

  return {
    precioAplicado: aplicaPromocion ? precioPromocional : item.precioUnitario,
    promocionAplicada: aplicaPromocion,
    promocionDisponible,
  };
}

function reducer(estado, accion) {
  switch (accion.type) {
    case ACCIONES.AGREGAR: {
      const { item, cantidad } = accion.payload;
      const existente = estado.find((actual) => actual.clave === item.clave);
      if (existente) {
        return estado.map((actual) => actual.clave === item.clave
          ? { ...actual, cantidad: actual.cantidad + cantidad }
          : actual);
      }
      return [...estado, { ...item, cantidad }];
    }
    case ACCIONES.ACTUALIZAR_CANTIDAD: {
      const { clave, cantidad } = accion.payload;
      if (cantidad <= 0) return estado.filter((item) => item.clave !== clave);
      return estado.map((item) => item.clave === clave ? { ...item, cantidad } : item);
    }
    case ACCIONES.ELIMINAR:
      return estado.filter((item) => item.clave !== accion.payload);
    case ACCIONES.VACIAR:
      return [];
    default:
      return estado;
  }
}

export function CarritoProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, []);

  // producto puede ser un producto, lote o presentación. Se guarda una copia del
  // precio para conservar el importe de la venta aunque el catálogo cambie.
  const agregarAlCarrito = useCallback((producto, { cantidad = 1, precioUnitario } = {}) => {
    const clave = obtenerClave(producto);
    const item = {
      ...producto,
      clave,
      precioUnitario: obtenerPrecio(producto, precioUnitario),
    };
    dispatch({ type: ACCIONES.AGREGAR, payload: { item, cantidad: numeroPositivo(cantidad) } });
  }, []);

  const actualizarCantidad = useCallback((clave, cantidad) => {
    const cantidadNormalizada = Number(cantidad);
    if (!Number.isFinite(cantidadNormalizada)) return;
    dispatch({
      type: ACCIONES.ACTUALIZAR_CANTIDAD,
      payload: { clave: String(clave), cantidad: Math.max(0, cantidadNormalizada) },
    });
  }, []);

  const incrementarCantidad = useCallback((clave) => {
    const item = items.find((actual) => actual.clave === String(clave));
    if (item) actualizarCantidad(item.clave, item.cantidad + 1);
  }, [items, actualizarCantidad]);

  const disminuirCantidad = useCallback((clave) => {
    const item = items.find((actual) => actual.clave === String(clave));
    if (item) actualizarCantidad(item.clave, item.cantidad - 1);
  }, [items, actualizarCantidad]);

  const eliminarDelCarrito = useCallback((clave) => {
    dispatch({ type: ACCIONES.ELIMINAR, payload: String(clave) });
  }, []);

  const vaciarCarrito = useCallback(() => dispatch({ type: ACCIONES.VACIAR }), []);

  const valor = useMemo(() => {
    const cantidadTotal = items.reduce((total, item) => total + item.cantidad, 0);
    const cantidadesPorProducto = items.reduce((cantidades, item) => {
      const idProducto = Number(item.id_producto);
      cantidades.set(idProducto, (cantidades.get(idProducto) || 0) + item.cantidad);
      return cantidades;
    }, new Map());
    const itemsCalculados = items.map((item) => ({
      ...item,
      ...calcularPrecioAplicado(
        item,
        cantidadesPorProducto.get(Number(item.id_producto)) || item.cantidad,
      ),
    }));
    const subtotal = itemsCalculados.reduce(
      (total, item) => total + item.precioAplicado * item.cantidad,
      0,
    );
    return {
      items: itemsCalculados,
      carrito: itemsCalculados,
      cantidadTotal,
      subtotal,
      total: subtotal,
      agregarAlCarrito,
      agregarProducto: agregarAlCarrito,
      actualizarCantidad,
      incrementarCantidad,
      disminuirCantidad,
      eliminarDelCarrito,
      quitarDelCarrito: eliminarDelCarrito,
      vaciarCarrito,
      limpiarCarrito: vaciarCarrito,
      estaEnCarrito: (clave) => items.some((item) => item.clave === String(clave)),
    };
  }, [items, agregarAlCarrito, actualizarCantidad, incrementarCantidad, disminuirCantidad, eliminarDelCarrito, vaciarCarrito]);

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const contexto = useContext(CarritoContext);
  if (!contexto) throw new Error('useCarrito debe usarse dentro de <CarritoProvider>.');
  return contexto;
}

export { ACCIONES as CARRITO_ACCIONES };
