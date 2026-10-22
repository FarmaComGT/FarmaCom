import { useEffect, useMemo, useState } from 'react';
import { actualizarPreciosLote, calcularMargenGanancia } from '../utils/lotePrecios.js';

export const LOTE_FORM_INICIAL = {
  id_producto: '', id_proveedor: '', id_sucursal: '', numero_lote: '',
  fecha_vencimiento: '', cantidad_ingresada: '', stock_actual: '',
  precio_compra: '', margen_ganancia: '', precio_venta: '',
  precio_mayoreo: '', cantidad_mayoreo: '',
};

export const fechaManana = () => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  const offset = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - offset).toISOString().slice(0, 10);
};

export const inicializarLoteForm = ({ lote, productoInicialId, sucursalInicialId, productos }) => {
  if (lote) {
    return {
      id_producto: String(lote.id_producto ?? ''), id_proveedor: String(lote.id_proveedor ?? ''),
      id_sucursal: String(lote.id_sucursal ?? ''), numero_lote: lote.numero_lote ?? '',
      fecha_vencimiento: String(lote.fecha_vencimiento ?? '').slice(0, 10),
      cantidad_ingresada: String(lote.cantidad_ingresada ?? ''), stock_actual: String(lote.stock_actual ?? ''),
      precio_compra: String(lote.precio_compra ?? ''), margen_ganancia: String(lote.margen_ganancia ?? ''),
      precio_venta: String(lote.precio_venta ?? ''),
      precio_mayoreo: lote.precio_mayoreo == null ? '' : String(lote.precio_mayoreo),
      cantidad_mayoreo: lote.cantidad_mayoreo == null ? '' : String(lote.cantidad_mayoreo),
    };
  }
  const producto = productos.find((item) => String(item.id_producto) === String(productoInicialId));
  return {
    ...LOTE_FORM_INICIAL,
    id_producto: productoInicialId ? String(productoInicialId) : '',
    id_sucursal: sucursalInicialId ? String(sucursalInicialId) : '',
    precio_compra: producto?.precio_compra == null ? '' : String(producto.precio_compra),
  };
};

const esEntero = (valor, minimo) => Number.isInteger(Number(valor)) && Number(valor) >= minimo;
const esNumeroNoNegativo = (valor) => valor !== '' && Number.isFinite(Number(valor)) && Number(valor) >= 0;

export const validarLoteForm = (formulario, modoEdicion, hoy = new Date()) => {
  if (!formulario.id_producto) return 'Selecciona un producto.';
  if (!formulario.id_proveedor) return 'Selecciona un proveedor.';
  if (!formulario.id_sucursal) return 'Selecciona una sucursal.';
  if (!formulario.numero_lote.trim()) return 'Ingresa el número de lote.';
  if (!formulario.fecha_vencimiento) return 'Selecciona la fecha de vencimiento.';
  if (!esEntero(formulario.cantidad_ingresada, 1)) return 'La cantidad ingresada debe ser un entero mayor a 0.';
  if (modoEdicion && !esEntero(formulario.stock_actual, 0)) return 'El stock actual debe ser un entero mayor o igual a 0.';
  if (modoEdicion && Number(formulario.stock_actual) > Number(formulario.cantidad_ingresada)) return 'El stock actual no puede superar la cantidad ingresada.';
  if (!esNumeroNoNegativo(formulario.precio_compra)) return 'Ingresa un precio de compra válido.';
  if (!esNumeroNoNegativo(formulario.precio_venta)) return 'Ingresa un precio de venta válido.';
  if (!esNumeroNoNegativo(formulario.margen_ganancia)) return 'Ingresa un margen válido.';
  const tienePrecio = formulario.precio_mayoreo !== '';
  const tieneCantidad = formulario.cantidad_mayoreo !== '';
  if (tienePrecio !== tieneCantidad) return 'Completa precio y cantidad de mayoreo, o deja ambos vacíos.';
  if (tienePrecio && !esNumeroNoNegativo(formulario.precio_mayoreo)) return 'Ingresa un precio de mayoreo válido.';
  if (tieneCantidad && !esEntero(formulario.cantidad_mayoreo, 1)) return 'La cantidad de mayoreo debe ser mayor a 0.';
  const inicioHoy = new Date(hoy); inicioHoy.setHours(0, 0, 0, 0);
  if (new Date(`${formulario.fecha_vencimiento}T00:00:00`) <= inicioHoy) return 'La fecha de vencimiento debe ser posterior a hoy.';
  return null;
};

export const construirPayloadLote = (formulario, lote) => {
  const payload = {
    id_producto: Number(formulario.id_producto), id_proveedor: Number(formulario.id_proveedor),
    id_sucursal: Number(formulario.id_sucursal), numero_lote: formulario.numero_lote.trim(),
    fecha_vencimiento: formulario.fecha_vencimiento, cantidad_ingresada: Number(formulario.cantidad_ingresada),
    precio_compra: Number(formulario.precio_compra), precio_venta: Number(formulario.precio_venta),
    margen_ganancia: Number(formulario.margen_ganancia),
    precio_mayoreo: formulario.precio_mayoreo === '' ? null : Number(formulario.precio_mayoreo),
    cantidad_mayoreo: formulario.cantidad_mayoreo === '' ? null : Number(formulario.cantidad_mayoreo),
  };
  if (lote) {
    payload.stock_actual = Number(formulario.stock_actual);
    payload.limpiar_mayoreo = lote.precio_mayoreo != null && formulario.precio_mayoreo === '';
  }
  return payload;
};

export default function useLoteForm({ isOpen, productos = [], productoInicialId, sucursalInicialId, lote, onSubmit }) {
  const modoEdicion = Boolean(lote);
  const productosActivos = useMemo(() => productos.filter(
    (producto) => producto.activo || String(producto.id_producto) === String(lote?.id_producto),
  ), [productos, lote?.id_producto]);
  const [formulario, setFormulario] = useState(LOTE_FORM_INICIAL);
  const [errorLocal, setErrorLocal] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormulario(inicializarLoteForm({ lote, productoInicialId, sucursalInicialId, productos: productosActivos }));
    setErrorLocal(null);
  }, [isOpen, lote, productoInicialId, productosActivos, sucursalInicialId]);

  const productoSeleccionado = productosActivos.find((producto) => String(producto.id_producto) === formulario.id_producto);
  const manejarCambio = ({ target: { name, value } }) => {
    setErrorLocal(null);
    if (name === 'id_producto') {
      const producto = productosActivos.find((item) => String(item.id_producto) === value);
      const compra = producto?.precio_compra == null ? '' : String(producto.precio_compra);
      setFormulario((actual) => ({ ...actual, id_producto: value, precio_compra: compra, margen_ganancia: calcularMargenGanancia(compra, actual.precio_venta) }));
    } else setFormulario((actual) => ({ ...actual, [name]: value }));
  };
  const manejarPrecioChange = (campo, valor) => {
    setErrorLocal(null);
    setFormulario((actual) => actualizarPreciosLote(actual, campo, valor));
  };
  const manejarEnvio = (evento) => {
    evento.preventDefault();
    const error = validarLoteForm(formulario, modoEdicion);
    if (error) { setErrorLocal(error); return; }
    onSubmit(construirPayloadLote(formulario, lote));
  };
  return { formulario, errorLocal, modoEdicion, productosActivos, productoSeleccionado, manejarCambio, manejarPrecioChange, manejarEnvio };
}
