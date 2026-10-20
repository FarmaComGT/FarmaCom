import { useEffect, useMemo, useState } from 'react';
import { sufijoPresentacion } from '../constants/presentaciones.js';

export const PRODUCTO_FORM_INICIAL = {
  nombre_comercial: '',
  nombre_generico: '',
  concentracion: '',
  id_presentacion: '',
  id_categoria: '',
  id_casa: '',
  id_proveedor: '',
  precio_compra: '',
  stock_minimo: '',
  meses_alerta_vencimiento: '',
  aplica_mayoreo: false,
  activo: true,
};

export const inicializarProductoForm = (producto) => {
  if (!producto) return { ...PRODUCTO_FORM_INICIAL };
  return {
    nombre_comercial: producto.nombre_comercial || '',
    nombre_generico: producto.nombre_generico || '',
    concentracion: producto.concentracion || '',
    id_presentacion: String(producto.id_presentacion || ''),
    id_categoria: String(producto.id_categoria || ''),
    id_casa: String(producto.id_casa || ''),
    id_proveedor: String(producto.id_proveedor || ''),
    precio_compra: producto.precio_compra != null ? String(producto.precio_compra) : '',
    stock_minimo: producto.stock_minimo != null ? String(producto.stock_minimo) : '',
    meses_alerta_vencimiento: producto.meses_alerta_vencimiento != null
      ? String(producto.meses_alerta_vencimiento)
      : '',
    aplica_mayoreo: producto.aplica_mayoreo ?? false,
    activo: producto.activo ?? true,
  };
};

export const validarProductoForm = (formulario) => {
  if (!formulario.nombre_comercial.trim()) return 'El nombre comercial es requerido.';
  if (!formulario.nombre_generico.trim()) return 'El nombre genérico es requerido.';
  if (!formulario.id_presentacion) return 'La presentación es requerida.';
  if (!formulario.id_categoria) return 'La categoría es requerida.';
  if (!formulario.id_casa) return 'La casa farmacéutica es requerida.';
  const precioCompra = Number(formulario.precio_compra);
  if (formulario.precio_compra === '' || !Number.isFinite(precioCompra) || precioCompra < 0) {
    return 'El precio de compra debe ser mayor o igual a 0.';
  }
  const stockMinimo = Number(formulario.stock_minimo);
  if (formulario.stock_minimo !== ''
    && (!Number.isInteger(stockMinimo) || stockMinimo < 0)) {
    return 'El stock mínimo debe ser mayor o igual a 0.';
  }
  if (!Number.isInteger(Number(formulario.meses_alerta_vencimiento))
    || Number(formulario.meses_alerta_vencimiento) < 1) {
    return 'Los meses de alerta deben ser mayores a 0.';
  }
  return null;
};

export const construirPayloadProducto = ({
  formulario,
  producto,
  codigoSugerido,
  presentaciones,
}) => {
  const presentacion = presentaciones.find(
    (item) => String(item.id_presentacion) === formulario.id_presentacion,
  );
  const sufijo = sufijoPresentacion(presentacion?.nombre);
  return {
    codigo: producto?.codigo || `${codigoSugerido}-${sufijo}`,
    nombre_comercial: formulario.nombre_comercial.trim(),
    nombre_generico: formulario.nombre_generico.trim(),
    concentracion: formulario.concentracion.trim() || null,
    id_presentacion: Number(formulario.id_presentacion),
    id_categoria: Number(formulario.id_categoria),
    id_casa: Number(formulario.id_casa),
    id_proveedor: formulario.id_proveedor ? Number(formulario.id_proveedor) : undefined,
    precio_compra: Number(formulario.precio_compra),
    stock_minimo: formulario.stock_minimo ? Number(formulario.stock_minimo) : undefined,
    meses_alerta_vencimiento: Number(formulario.meses_alerta_vencimiento),
    aplica_mayoreo: formulario.aplica_mayoreo,
  };
};

export default function useProductoForm({
  isOpen,
  modoEdicion,
  producto,
  codigoSugerido,
  presentaciones = [],
  onSubmit,
}) {
  const [formulario, setFormulario] = useState(PRODUCTO_FORM_INICIAL);
  const [errorValidacion, setErrorValidacion] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormulario(inicializarProductoForm(modoEdicion ? producto : null));
    setErrorValidacion(null);
  }, [isOpen, modoEdicion, producto]);

  const presentacionSeleccionada = useMemo(
    () => presentaciones.find(
      (item) => String(item.id_presentacion) === formulario.id_presentacion,
    ),
    [formulario.id_presentacion, presentaciones],
  );
  const sufijo = sufijoPresentacion(presentacionSeleccionada?.nombre);
  const codigoMostrado = modoEdicion && producto?.codigo
    ? producto.codigo
    : `${codigoSugerido || 'MED-AUTO'}${sufijo ? `-${sufijo}` : ''}`;

  const manejarCambio = ({ target: { name, value, type, checked } }) => {
    setFormulario((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrorValidacion(null);
  };

  const manejarToggleActivo = () => {
    setFormulario((actual) => ({ ...actual, activo: !actual.activo }));
  };

  const seleccionarPresentacion = (idPresentacion) => {
    setFormulario((actual) => ({
      ...actual,
      id_presentacion: idPresentacion == null ? '' : String(idPresentacion),
    }));
  };

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    const error = validarProductoForm(formulario);
    if (error) {
      setErrorValidacion(error);
      return;
    }
    onSubmit(construirPayloadProducto({
      formulario,
      producto: modoEdicion ? producto : null,
      codigoSugerido,
      presentaciones,
    }));
  };

  return {
    formulario,
    codigoMostrado,
    presentacionSeleccionada,
    errorValidacion,
    manejarCambio,
    manejarToggleActivo,
    manejarEnvio,
    seleccionarPresentacion,
  };
}
