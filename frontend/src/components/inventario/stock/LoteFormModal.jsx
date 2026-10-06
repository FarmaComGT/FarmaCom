import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, PackagePlus, Pencil, X } from 'lucide-react';
import { motion } from 'motion/react';
const ESTADO_INICIAL = {
  id_producto: '',
  id_proveedor: '',
  id_sucursal: '',
  numero_lote: '',
  fecha_vencimiento: '',
  cantidad_ingresada: '',
  stock_actual: '',
  precio_compra: '',
  margen_ganancia: '',
  precio_venta: '',
  precio_mayoreo: '',
  cantidad_mayoreo: '',
};

const fechaManana = () => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  const offset = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - offset).toISOString().slice(0, 10);
};

const formatoDecimal = (valor, decimales = 2) => {
  if (!Number.isFinite(valor)) return '';
  return valor.toFixed(decimales);
};

const esEnteroPositivo = (valor) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1;
};

export default function LoteFormModal({
  isOpen,
  productos,
  proveedores,
  sucursales,
  sucursalInicialId,
  lote = null,
  cargandoDatos,
  guardando = false,
  errorFormulario = null,
  onClose,
  onSubmit,
}) {
  const [formulario, setFormulario] = useState(ESTADO_INICIAL);
  const [errorLocal, setErrorLocal] = useState(null);
  const modoEdicion = Boolean(lote);

  const productosActivos = useMemo(
    () => (productos || []).filter(
      (producto) => producto.activo || String(producto.id_producto) === String(lote?.id_producto),
    ),
    [productos, lote?.id_producto],
  );

  const productoSeleccionado = useMemo(
    () => productosActivos.find((producto) => String(producto.id_producto) === formulario.id_producto),
    [productosActivos, formulario.id_producto],
  );

  const presentacionEtiqueta = productoSeleccionado?.presentacion;

  useEffect(() => {
    if (!isOpen) return;

    setFormulario(lote ? {
      id_producto: String(lote.id_producto ?? ''),
      id_proveedor: String(lote.id_proveedor ?? ''),
      id_sucursal: String(lote.id_sucursal ?? ''),
      numero_lote: lote.numero_lote ?? '',
      fecha_vencimiento: String(lote.fecha_vencimiento ?? '').slice(0, 10),
      cantidad_ingresada: String(lote.cantidad_ingresada ?? ''),
      stock_actual: String(lote.stock_actual ?? ''),
      precio_compra: String(lote.precio_compra ?? ''),
      margen_ganancia: String(lote.margen_ganancia ?? ''),
      precio_venta: String(lote.precio_venta ?? ''),
      precio_mayoreo: lote.precio_mayoreo == null ? '' : String(lote.precio_mayoreo),
      cantidad_mayoreo: lote.cantidad_mayoreo == null ? '' : String(lote.cantidad_mayoreo),
    } : {
      ...ESTADO_INICIAL,
      id_sucursal: sucursalInicialId ? String(sucursalInicialId) : '',
    });
    setErrorLocal(null);
  }, [isOpen, lote, sucursalInicialId]);

  if (!isOpen || typeof document === 'undefined') return null;

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setErrorLocal(null);

    if (name === 'id_producto') {
      const producto = productosActivos.find(
        (item) => String(item.id_producto) === value,
      );
      const precioCompraProducto = producto?.precio_compra == null
        ? ''
        : String(producto.precio_compra);

      setFormulario((prev) => {
        const compra = Number(precioCompraProducto);
        const venta = Number(prev.precio_venta);
        const margen = prev.precio_venta === '' || compra <= 0
          ? ''
          : formatoDecimal(((venta / compra) - 1) * 100, 4);

        return {
          ...prev,
          id_producto: value,
          precio_compra: precioCompraProducto,
          margen_ganancia: margen,
        };
      });
      return;
    }

    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const manejarPrecioChange = (campo, valor) => {
    setErrorLocal(null);

    setFormulario((prev) => {
      if (campo === 'margen_ganancia') {
        const margen = Number(valor);
        const precioCompra = Number(prev.precio_compra);
        const precio = valor === '' ? '' : formatoDecimal(precioCompra * (1 + margen / 100), 2);
        return { ...prev, margen_ganancia: valor, precio_venta: precio };
      }

      if (campo === 'precio_venta') {
        const precio = Number(valor);
        const precioCompra = Number(prev.precio_compra);
        const margen = valor === '' || precioCompra <= 0
          ? ''
          : formatoDecimal(((precio / precioCompra) - 1) * 100, 4);
        return { ...prev, precio_venta: valor, margen_ganancia: margen };
      }

      if (campo === 'precio_compra') {
        const precioCompra = Number(valor);
        const precioVenta = Number(prev.precio_venta);
        const margen = valor === '' || prev.precio_venta === '' || precioCompra <= 0
          ? ''
          : formatoDecimal(((precioVenta / precioCompra) - 1) * 100, 4);
        return { ...prev, precio_compra: valor, margen_ganancia: margen };
      }

      return { ...prev, [campo]: valor };
    });
  };

  const validarFormulario = () => {
    if (!formulario.id_producto) return 'Selecciona un producto.';
    if (!formulario.id_proveedor) return 'Selecciona un proveedor.';
    if (!formulario.id_sucursal) return 'Selecciona una sucursal.';
    if (!formulario.numero_lote.trim()) return 'Ingresa el número de lote.';
    if (!formulario.fecha_vencimiento) return 'Selecciona la fecha de vencimiento.';
    if (!esEnteroPositivo(formulario.cantidad_ingresada)) {
      return 'La cantidad ingresada debe ser un entero mayor a 0.';
    }
    if (modoEdicion) {
      const stock = Number(formulario.stock_actual);
      if (!Number.isInteger(stock) || stock < 0) {
        return 'El stock actual debe ser un entero mayor o igual a 0.';
      }
      if (stock > Number(formulario.cantidad_ingresada)) {
        return 'El stock actual no puede superar la cantidad ingresada.';
      }
    }
    
    if (formulario.precio_compra === '' || Number(formulario.precio_compra) < 0) {
      return 'Ingresa un precio de compra válido.';
    }
    if (formulario.precio_venta === '' || Number(formulario.precio_venta) < 0) {
      return 'Ingresa un precio de venta válido.';
    }
    if (formulario.margen_ganancia === '' || Number(formulario.margen_ganancia) < 0) {
      return 'Ingresa un margen válido.';
    }

    const tienePrecioMayoreo = formulario.precio_mayoreo !== '';
    const tieneCantidadMayoreo = formulario.cantidad_mayoreo !== '';
    if (tienePrecioMayoreo !== tieneCantidadMayoreo) {
      return 'Completa precio y cantidad de mayoreo, o deja ambos vacíos.';
    }
    if (tieneCantidadMayoreo && Number(formulario.cantidad_mayoreo) < 1) {
      return 'La cantidad de mayoreo debe ser mayor a 0.';
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaVencimiento = new Date(`${formulario.fecha_vencimiento}T00:00:00`);
    if (fechaVencimiento <= hoy) return 'La fecha de vencimiento debe ser posterior a hoy.';

    return null;
  };

  const manejarEnvio = (e) => {
    e.preventDefault();

    const error = validarFormulario();
    if (error) {
      setErrorLocal(error);
      return;
    }

    const payload = {
      id_producto: Number(formulario.id_producto),
      id_proveedor: Number(formulario.id_proveedor),
      id_sucursal: Number(formulario.id_sucursal),
      numero_lote: formulario.numero_lote.trim(),
      fecha_vencimiento: formulario.fecha_vencimiento,
      cantidad_ingresada: Number(formulario.cantidad_ingresada),
      precio_compra: Number(formulario.precio_compra),
      precio_venta: Number(formulario.precio_venta),
      margen_ganancia: Number(formulario.margen_ganancia),
      precio_mayoreo: formulario.precio_mayoreo === '' ? null : Number(formulario.precio_mayoreo),
      cantidad_mayoreo: formulario.cantidad_mayoreo === '' ? null : Number(formulario.cantidad_mayoreo),
    };

    if (modoEdicion) {
      payload.stock_actual = Number(formulario.stock_actual);
      payload.limpiar_mayoreo = lote.precio_mayoreo != null && formulario.precio_mayoreo === '';
    }

    onSubmit(payload);
  };

  const renderSelectIcon = () => (
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2 text-primary">
              {modoEdicion ? <Pencil className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <h3 className="font-headline text-lg font-extrabold text-primary">
                {modoEdicion ? 'Editar lote' : 'Ingresar lote'}
              </h3>
              <p className="truncate text-xs text-slate-500">
                {modoEdicion
                  ? `Actualiza los datos de ${lote.numero_lote}`
                  : 'Registro manual para el inventario de sucursal'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-5 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Datos del lote
            </p>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">
                Producto <span className="text-error">*</span>
              </label>
              <div className="relative">
                <select
                  name="id_producto"
                  value={formulario.id_producto}
                  onChange={manejarCambio}
                  disabled={cargandoDatos}
                  required
                  className="w-full appearance-none rounded-xl border border-slate-300 px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">Seleccionar producto...</option>
                  {productosActivos.map((producto) => (
                    <option key={producto.id_producto} value={producto.id_producto}>
                      {producto.nombre_comercial}
                      {producto.concentracion ? ` ${producto.concentracion}` : ''}
                      {producto.presentacion ? ` · ${producto.presentacion}` : ''}
                      {' '}- {producto.codigo}
                    </option>
                  ))}
                </select>
                {renderSelectIcon()}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="precio_compra_lote" className="text-sm font-semibold text-slate-700">
                  Precio compra <span className="text-error">*</span>
                </label>
                <input
                  id="precio_compra_lote"
                  type="number"
                  value={formulario.precio_compra}
                  onChange={(e) => manejarPrecioChange('precio_compra', e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-slate-500">
                  Se precarga con el valor sugerido del producto y se guarda para este lote.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Proveedor <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select
                    name="id_proveedor"
                    value={formulario.id_proveedor}
                    onChange={manejarCambio}
                    disabled={cargandoDatos}
                    required
                    className="w-full appearance-none rounded-xl border border-slate-300 px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Seleccionar...</option>
                    {(proveedores || []).map((proveedor) => (
                      <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                  {renderSelectIcon()}
                </div>
              </div>
            </div>

            {modoEdicion && (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Stock actual <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  name="stock_actual"
                  value={formulario.stock_actual}
                  onChange={manejarCambio}
                  min="0"
                  step="1"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-slate-500">
                  No puede superar la cantidad ingresada del lote.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Sucursal <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select
                    name="id_sucursal"
                    value={formulario.id_sucursal}
                    onChange={manejarCambio}
                    disabled={cargandoDatos}
                    required
                    className="w-full appearance-none rounded-xl border border-slate-300 px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Seleccionar...</option>
                    {(sucursales || []).map((sucursal) => (
                      <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                        {sucursal.nombre_sucursal}
                      </option>
                    ))}
                  </select>
                  {renderSelectIcon()}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Número de lote <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  name="numero_lote"
                  value={formulario.numero_lote}
                  onChange={manejarCambio}
                  placeholder="Ej. LT-2026-001"
                  maxLength={100}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Vencimiento <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  name="fecha_vencimiento"
                  value={formulario.fecha_vencimiento}
                  onChange={manejarCambio}
                  min={fechaManana()}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Cantidad ingresada <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  name="cantidad_ingresada"
                  value={formulario.cantidad_ingresada}
                  onChange={manejarCambio}
                  placeholder="0"
                  min="1"
                  step="1"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Presentación</label>
              <input
                type="text"
                value={presentacionEtiqueta || 'Depende del producto seleccionado'}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500"
              />
              <p className="text-xs text-slate-500">
                La presentación viene del producto. Si necesitas otra, regístrala como un producto aparte.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Precios del lote
            </p>

            <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">
                    Margen % <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    value={formulario.margen_ganancia}
                    onChange={(e) => manejarPrecioChange('margen_ganancia', e.target.value)}
                    min="0"
                    step="0.0001"
                    required
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">
                    Precio venta <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    value={formulario.precio_venta}
                    onChange={(e) => manejarPrecioChange('precio_venta', e.target.value)}
                    min="0"
                    step="0.01"
                    required
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Precio mayoreo</label>
                  <input
                    type="number"
                    value={formulario.precio_mayoreo}
                    onChange={(e) => manejarPrecioChange('precio_mayoreo', e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Cantidad mayoreo</label>
                  <input
                    type="number"
                    value={formulario.cantidad_mayoreo}
                    onChange={(e) => manejarPrecioChange('cantidad_mayoreo', e.target.value)}
                    min="1"
                    step="1"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </section>

          {(errorLocal || errorFormulario) && (
            <p className="text-sm font-semibold text-error">{errorLocal || errorFormulario}</p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargandoDatos || guardando}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Guardar lote'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}
