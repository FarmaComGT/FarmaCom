import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import useAvisoCambiosSinGuardar from '../hooks/useAvisoCambiosSinGuardar';
import { useAuthOpcional } from './AuthContext';

const CarritoContext = createContext(null);

const ACCIONES = {
  AGREGAR: 'AGREGAR',
  ACTUALIZAR_CANTIDAD: 'ACTUALIZAR_CANTIDAD',
  ELIMINAR: 'ELIMINAR',
  VACIAR: 'VACIAR',
  REINICIAR: 'REINICIAR',
  CREAR_CARRITO: 'CREAR_CARRITO',
  CAMBIAR_CARRITO: 'CAMBIAR_CARRITO',
  RENOMBRAR_CARRITO: 'RENOMBRAR_CARRITO',
  CERRAR_CARRITO: 'CERRAR_CARRITO',
  SELECCIONAR_CLIENTE: 'SELECCIONAR_CLIENTE',
  ACTUALIZAR_COTIZACION: 'ACTUALIZAR_COTIZACION',
};

const crearCarrito = (id, nombre) => ({
  id,
  nombre,
  items: [],
  clienteSeleccionado: null,
});

const crearEstadoInicial = () => ({
  carritos: [crearCarrito('carrito-1', 'Carrito 1')],
  carritoActivoId: 'carrito-1',
});

const PREFIJO_PERSISTENCIA = 'farmacom:carritos:v1';

const normalizarEstadoPersistido = (valor) => {
  if (!valor || !Array.isArray(valor.carritos) || valor.carritos.length === 0) {
    return crearEstadoInicial();
  }
  const ids = new Set();
  const carritos = valor.carritos.reduce((resultado, carrito) => {
    if (!carrito || typeof carrito !== 'object') return resultado;
    const id = String(carrito.id || '').trim();
    if (!id || ids.has(id) || !Array.isArray(carrito.items)) return resultado;
    ids.add(id);
    resultado.push({
      id,
      nombre: String(carrito.nombre || 'Carrito').trim().slice(0, 40) || 'Carrito',
      items: carrito.items.filter((item) => (
        item && typeof item === 'object' && item.clave && Number(item.cantidad) > 0
      )),
      clienteSeleccionado: carrito.clienteSeleccionado || null,
    });
    return resultado;
  }, []);
  if (carritos.length === 0) return crearEstadoInicial();
  const carritoActivoId = carritos.some((carrito) => carrito.id === valor.carritoActivoId)
    ? valor.carritoActivoId
    : carritos[0].id;
  return { carritos, carritoActivoId };
};

const cargarEstado = (clavePersistencia) => {
  if (!clavePersistencia || typeof window === 'undefined') return crearEstadoInicial();
  try {
    const guardado = window.localStorage.getItem(clavePersistencia);
    return guardado ? normalizarEstadoPersistido(JSON.parse(guardado)) : crearEstadoInicial();
  } catch {
    return crearEstadoInicial();
  }
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

export function calcularPrecioAplicado(item, cantidadProducto = item.cantidad, saldoDisponible = item.promocion?.cantidad_disponible) {
  const minimo = Number(item.promocion?.cantidad_minima);
  const precioPromocional = Number(item.promocion?.precio_promocion);
  const promocionDisponible = Number.isFinite(minimo)
    && minimo > 0
    && Number.isFinite(precioPromocional)
    && precioPromocional > 0
    && (saldoDisponible == null || Number(saldoDisponible) > 0)
    && precioPromocional < item.precioUnitario;
  const aplicaPromocion = promocionDisponible && cantidadProducto >= minimo;
  const cantidadPromocion = aplicaPromocion ? Math.min(item.cantidad, saldoDisponible == null ? Infinity : Math.max(0, Number(saldoDisponible))) : 0;
  const cantidadNormal = item.cantidad - cantidadPromocion;

  return {
    precioAplicado: aplicaPromocion ? precioPromocional : item.precioUnitario,
    promocionAplicada: aplicaPromocion,
    promocionDisponible,
    cantidadPromocion,
    cantidadNormal,
    cantidadProducto,
    subtotalItem: (cantidadPromocion * Math.round(precioPromocional * 100) || 0) / 100 + cantidadNormal * Math.round(item.precioUnitario * 100) / 100,
  };
}

const actualizarCarrito = (estado, idCarrito, actualizar) => ({
  ...estado,
  carritos: estado.carritos.map((carrito) => (
    carrito.id === idCarrito ? actualizar(carrito) : carrito
  )),
});

const actualizarItemsActivos = (estado, actualizar) => actualizarCarrito(
  estado,
  estado.carritoActivoId,
  (carrito) => ({ ...carrito, items: actualizar(carrito.items) }),
);

function reducer(estado, accion) {
  switch (accion.type) {
    case ACCIONES.ACTUALIZAR_COTIZACION:
      return actualizarItemsActivos(estado, (items) => items.map((item) => {
        const actualizado = accion.payload.find((lote) => Number(lote.id_lote) === Number(item.id_lote));
        return actualizado ? { ...item, promocion: actualizado.promocion, precioUnitario: Number(actualizado.precio_venta) } : item;
      }));
    case ACCIONES.AGREGAR: {
      const { item, cantidad } = accion.payload;
      return actualizarItemsActivos(estado, (items) => {
        const existente = items.find((actual) => actual.clave === item.clave);
        if (existente) {
          return items.map((actual) => actual.clave === item.clave
            ? { ...actual, cantidad: actual.cantidad + cantidad }
            : actual);
        }
        return [...items, { ...item, cantidad }];
      });
    }
    case ACCIONES.ACTUALIZAR_CANTIDAD: {
      const { clave, cantidad } = accion.payload;
      return actualizarItemsActivos(estado, (items) => (
        cantidad <= 0
          ? items.filter((item) => item.clave !== clave)
          : items.map((item) => item.clave === clave ? { ...item, cantidad } : item)
      ));
    }
    case ACCIONES.ELIMINAR:
      return actualizarItemsActivos(
        estado,
        (items) => items.filter((item) => item.clave !== accion.payload),
      );
    case ACCIONES.VACIAR:
      return actualizarItemsActivos(estado, () => []);
    case ACCIONES.REINICIAR:
      return actualizarCarrito(
        estado,
        accion.payload || estado.carritoActivoId,
        (carrito) => ({ ...carrito, items: [], clienteSeleccionado: null }),
      );
    case ACCIONES.CREAR_CARRITO:
      return {
        carritos: [...estado.carritos, accion.payload],
        carritoActivoId: accion.payload.id,
      };
    case ACCIONES.CAMBIAR_CARRITO:
      return estado.carritos.some((carrito) => carrito.id === accion.payload)
        ? { ...estado, carritoActivoId: accion.payload }
        : estado;
    case ACCIONES.RENOMBRAR_CARRITO:
      return actualizarCarrito(
        estado,
        accion.payload.id,
        (carrito) => ({ ...carrito, nombre: accion.payload.nombre }),
      );
    case ACCIONES.SELECCIONAR_CLIENTE:
      return actualizarCarrito(
        estado,
        estado.carritoActivoId,
        (carrito) => ({ ...carrito, clienteSeleccionado: accion.payload }),
      );
    case ACCIONES.CERRAR_CARRITO: {
      const indice = estado.carritos.findIndex((carrito) => carrito.id === accion.payload.id);
      if (indice < 0) return estado;

      const restantes = estado.carritos.filter((carrito) => carrito.id !== accion.payload.id);
      if (restantes.length === 0) {
        return {
          carritos: [accion.payload.reemplazo],
          carritoActivoId: accion.payload.reemplazo.id,
        };
      }

      if (estado.carritoActivoId !== accion.payload.id) {
        return { ...estado, carritos: restantes };
      }

      return {
        carritos: restantes,
        carritoActivoId: restantes[Math.min(indice, restantes.length - 1)].id,
      };
    }
    default:
      return estado;
  }
}

function CarritoStateProvider({ children, clavePersistencia }) {
  const [estado, dispatch] = useReducer(
    reducer,
    clavePersistencia,
    cargarEstado,
  );
  useAvisoCambiosSinGuardar(estado.carritos.some(carrito => carrito.items.length > 0));
  const siguienteCarrito = useRef(estado.carritos.reduce((mayor, carrito) => {
    const coincidencia = carrito.id.match(/^carrito-(\d+)$/);
    return coincidencia ? Math.max(mayor, Number(coincidencia[1]) + 1) : mayor;
  }, 2));
  const carritoActivo = estado.carritos.find(
    (carrito) => carrito.id === estado.carritoActivoId,
  ) || estado.carritos[0];
  const items = carritoActivo.items;

  useEffect(() => {
    if (!clavePersistencia || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(clavePersistencia, JSON.stringify(estado));
    } catch {
      // El carrito sigue disponible en memoria si el almacenamiento está bloqueado o lleno.
    }
  }, [clavePersistencia, estado]);

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
  const reiniciarCarrito = useCallback((idCarrito) => dispatch({
    type: ACCIONES.REINICIAR,
    payload: idCarrito ? String(idCarrito) : null,
  }), []);

  const crearNuevoCarrito = useCallback(() => {
    const numero = siguienteCarrito.current;
    siguienteCarrito.current += 1;
    const nuevo = crearCarrito(`carrito-${numero}`, `Carrito ${numero}`);
    dispatch({ type: ACCIONES.CREAR_CARRITO, payload: nuevo });
    return nuevo.id;
  }, []);

  const cambiarCarrito = useCallback((idCarrito) => {
    dispatch({ type: ACCIONES.CAMBIAR_CARRITO, payload: String(idCarrito) });
  }, []);

  const renombrarCarrito = useCallback((idCarrito, nombre) => {
    const nombreLimpio = String(nombre || '').trim().slice(0, 40);
    if (!nombreLimpio) return false;
    dispatch({
      type: ACCIONES.RENOMBRAR_CARRITO,
      payload: { id: String(idCarrito), nombre: nombreLimpio },
    });
    return true;
  }, []);

  const cerrarCarrito = useCallback((idCarrito) => {
    let reemplazo = null;
    if (estado.carritos.length === 1) {
      const numero = siguienteCarrito.current;
      siguienteCarrito.current += 1;
      reemplazo = crearCarrito(`carrito-${numero}`, `Carrito ${numero}`);
    }
    dispatch({
      type: ACCIONES.CERRAR_CARRITO,
      payload: { id: String(idCarrito), reemplazo },
    });
  }, [estado.carritos.length]);

  const seleccionarCliente = useCallback((cliente) => {
    dispatch({ type: ACCIONES.SELECCIONAR_CLIENTE, payload: cliente || null });
  }, []);
  const actualizarCotizacion = useCallback((lotes) => dispatch({ type: ACCIONES.ACTUALIZAR_COTIZACION, payload: lotes }), []);

  const valor = useMemo(() => {
    const cantidadTotal = items.reduce((total, item) => total + item.cantidad, 0);
    const cantidadesPorProducto = items.reduce((cantidades, item) => {
      const idProducto = Number(item.id_producto);
      cantidades.set(idProducto, (cantidades.get(idProducto) || 0) + item.cantidad);
      return cantidades;
    }, new Map());
    const saldos = new Map();
    const calculados = new Map();
    [...items].sort((a, b) => Number(a.id_lote) - Number(b.id_lote)).forEach((item) => {
      const id = item.promocion?.id_promocion;
      if (!saldos.has(id)) saldos.set(id, item.promocion?.cantidad_disponible);
      const precio = calcularPrecioAplicado(item, cantidadesPorProducto.get(Number(item.id_producto)) || item.cantidad, saldos.get(id));
      if (saldos.get(id) != null) saldos.set(id, Number(saldos.get(id)) - precio.cantidadPromocion);
      calculados.set(item.clave, { ...item, ...precio });
    });
    const itemsCalculados = items.map((item) => calculados.get(item.clave));
    const subtotal = itemsCalculados.reduce(
      (total, item) => total + Math.round(item.subtotalItem * 100),
      0,
    ) / 100;
    return {
      carritos: estado.carritos,
      carritoActivo,
      carritoActivoId: carritoActivo.id,
      items: itemsCalculados,
      carrito: itemsCalculados,
      cantidadTotal,
      subtotal,
      total: subtotal,
      actualizarCotizacion,
      agregarAlCarrito,
      agregarProducto: agregarAlCarrito,
      actualizarCantidad,
      incrementarCantidad,
      disminuirCantidad,
      eliminarDelCarrito,
      quitarDelCarrito: eliminarDelCarrito,
      vaciarCarrito,
      limpiarCarrito: vaciarCarrito,
      reiniciarCarrito,
      clienteSeleccionado: carritoActivo.clienteSeleccionado,
      seleccionarCliente,
      setClienteSeleccionado: seleccionarCliente,
      crearCarrito: crearNuevoCarrito,
      cambiarCarrito,
      renombrarCarrito,
      cerrarCarrito,
      estaEnCarrito: (clave) => items.some((item) => item.clave === String(clave)),
    };
  }, [
    agregarAlCarrito,
    actualizarCantidad,
    actualizarCotizacion,
    cambiarCarrito,
    carritoActivo,
    cerrarCarrito,
    crearNuevoCarrito,
    disminuirCantidad,
    eliminarDelCarrito,
    estado.carritos,
    incrementarCantidad,
    items,
    renombrarCarrito,
    reiniciarCarrito,
    seleccionarCliente,
    vaciarCarrito,
  ]);

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function CarritoProvider({ children, usuarioId, sucursalId }) {
  const autenticacion = useAuthOpcional();
  const idUsuario = usuarioId ?? autenticacion?.usuario?.id_usuario;
  const idSucursal = sucursalId ?? autenticacion?.sucursalActivaId;
  const clavePersistencia = idUsuario && idSucursal
    ? `${PREFIJO_PERSISTENCIA}:${idUsuario}:${idSucursal}`
    : null;

  return (
    <CarritoStateProvider key={clavePersistencia || 'carrito-sin-alcance'} clavePersistencia={clavePersistencia}>
      {children}
    </CarritoStateProvider>
  );
}

export function useCarrito() {
  const contexto = useContext(CarritoContext);
  if (!contexto) throw new Error('useCarrito debe usarse dentro de <CarritoProvider>.');
  return contexto;
}

export { ACCIONES as CARRITO_ACCIONES };
