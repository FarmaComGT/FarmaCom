import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle, X } from 'lucide-react';
import useAvisoCambiosSinGuardar, { confirmarDescartarCambios } from '../../../hooks/useAvisoCambiosSinGuardar.js';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import PromocionProductoPicker from './PromocionProductoPicker.jsx';
import styles from '../../../styles/ManagementUI.module.css';
import local from './Promociones.module.css';
import { cantidadPromocion } from '../../../utils/promociones';

const moneda = (valor) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(valor);

export default function PromocionFormModal({ isOpen, modoEdicion, producto, onProducto, sucursales = [], formulario,
  hayCambios, guardando, cargando, precioReferencia, cargandoPrecioReferencia, errorReferencia, onReintentarReferencia,
  errores = {}, error, conflicto, onChange, onClose, onSubmit, onReintentar }) {
  const ref = useRef(null);
  useAvisoCambiosSinGuardar(isOpen && hayCambios && !guardando);
  useEffect(() => {
    const campo = Object.keys(errores)[0];
    if (campo) ref.current?.elements.namedItem(campo)?.focus();
  }, [errores]);
  const cerrar = () => { if (!guardando && (!hayCambios || confirmarDescartarCambios())) onClose(); };
  const ayudaError = (campo) => errores[campo] && <p id={'error-' + campo} className={styles.fieldError} aria-live="polite">{errores[campo]}</p>;
  const propsCampo = (campo) => ({ name: campo, value: formulario[campo] ?? '', onChange, disabled: guardando,
    'aria-invalid': Boolean(errores[campo]), 'aria-describedby': errores[campo] ? 'error-' + campo : undefined, className: styles.input });
  const resumenValido = producto && Number(formulario.cantidad_minima) >= 1 && Number(formulario.precio_promocion) > 0;
  return <AccessibleDialog open={isOpen} labelledBy="titulo-promocion" onClose={cerrar} busy={guardando} size="large">
    <div className={styles.dialogContent}>
      <header className={styles.dialogHeader}><div><h2 id="titulo-promocion">{modoEdicion ? 'Editar promoción' : 'Nueva promoción'}</h2><p>Precio especial por unidad al alcanzar una cantidad mínima.</p></div><button type="button" onClick={cerrar} disabled={guardando} className={styles.button + ' ' + styles.iconButton} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button></header>
      {cargando ? <p role="status">Cargando datos de la promoción…</p> : <form ref={ref} noValidate onSubmit={onSubmit} className={styles.form}>
        <PromocionProductoPicker producto={producto} onSeleccionar={onProducto} bloqueado={guardando || modoEdicion} error={errores.id_producto} />
        <div className={styles.field}><label htmlFor="promocion-nombre">Nombre <span className={styles.optional}>(opcional)</span></label>
          <input id="promocion-nombre" {...propsCampo('nombre')} maxLength={120} placeholder="Ej.: Mayoreo de paracetamol…" aria-describedby={errores.nombre ? 'error-nombre' : 'nombre-promocion-ayuda'} />
          <p id="nombre-promocion-ayuda" className={styles.helpText}>Si lo dejas vacío, se identificará por el producto y la cantidad mínima.</p>{ayudaError('nombre')}</div>
        <div className={styles.field}><label htmlFor="promocion-sucursal" className="campo-requerido">Sucursal</label>
          <select aria-required="true" id="promocion-sucursal" {...propsCampo('id_sucursal')} disabled={guardando || modoEdicion}><option value="">Selecciona una sucursal</option>{sucursales.map((s) => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre_sucursal}</option>)}</select>
          {modoEdicion && <p className={styles.helpText}>El producto y la sucursal se conservan al editar.</p>}{ayudaError('id_sucursal')}</div>
        <div className={styles.formGrid}>
          <div className={styles.field}><label htmlFor="promocion-cantidad" className="campo-requerido">Cantidad mínima por venta</label><input aria-required="true" id="promocion-cantidad" {...propsCampo('cantidad_minima')} type="number" inputMode="numeric" min="1" step="1" />{ayudaError('cantidad_minima')}</div>
          <div className={styles.field}><label htmlFor="promocion-precio" className="campo-requerido">Precio por unidad (Q)</label><input aria-required="true" id="promocion-precio" {...propsCampo('precio_promocion')} type="number" inputMode="decimal" min="0.01" step="0.01" />{ayudaError('precio_promocion')}
            <p className={styles.helpText}>{cargandoPrecioReferencia ? 'Consultando precio normal…' : errorReferencia || (precioReferencia != null ? 'Precio normal mínimo actual: ' + moneda(precioReferencia) + '.' : producto && formulario.id_sucursal ? 'No hay lotes vendibles con precio en esta sucursal.' : 'Elige producto y sucursal para consultar el precio normal.')}</p>
            {errorReferencia && <button type="button" onClick={onReintentarReferencia} className={styles.button}>Reintentar precio</button>}</div>
        </div>
        <div className={styles.field}><label htmlFor="promocion-maxima">Cantidad máxima acumulada <span className={styles.optional}>(opcional)</span></label>
          <input id="promocion-maxima" {...propsCampo('cantidad_maxima')} type="number" inputMode="numeric" min="1" step="1" placeholder="Ej.: 100…" aria-describedby={errores.cantidad_maxima ? 'error-cantidad_maxima' : 'cupo-promocion-ayuda'} />
          <p id="cupo-promocion-ayuda" className={styles.helpText}>Total de unidades que pueden venderse con esta promoción en la sucursal, entre todas las ventas. Déjalo vacío para no limitarla. Al agotarse el cupo, se cobra el precio normal.</p>{ayudaError('cantidad_maxima')}
          {modoEdicion && <p className={styles.helpText}>{cantidadPromocion(producto?.cantidad_vendida || 0)} vendidas · {cantidadPromocion(producto?.cantidad_reservada || 0)} reservadas en pagos con tarjeta. Las anulaciones devuelven el cupo.</p>}</div>
        <div className={styles.formGrid}>
          <div className={styles.field}><label htmlFor="promocion-inicio" className="campo-requerido">Fecha de inicio</label><input aria-required="true" id="promocion-inicio" {...propsCampo('fecha_inicio')} type="date" />{ayudaError('fecha_inicio')}</div>
          <div className={styles.field}><label htmlFor="promocion-fin" className={!formulario.sin_fin ? 'campo-requerido' : undefined}>Fecha de finalización</label><input aria-required={!formulario.sin_fin} id="promocion-fin" {...propsCampo('fecha_fin')} disabled={guardando || formulario.sin_fin} type="date" min={formulario.fecha_inicio || undefined} />{ayudaError('fecha_fin')}</div>
        </div>
        <label className={local.check}><input type="checkbox" name="sin_fin" checked={Boolean(formulario.sin_fin)} onChange={onChange} disabled={guardando} />Sin fecha de finalización</label>
        {resumenValido && <div className={local.preview} aria-live="polite"><p><strong>Desde {cantidadPromocion(formulario.cantidad_minima)} por venta, cada unidad cuesta {moneda(formulario.precio_promocion)}.</strong></p><p>{producto.nombre_comercial}{producto.presentacion ? ' · ' + producto.presentacion : ''}{formulario.cantidad_maxima ? '. Hasta ' + cantidadPromocion(formulario.cantidad_maxima) + ' acumuladas; las unidades que excedan el saldo van a precio normal.' : formulario.sin_fin ? '. Se aplicará desde la fecha de inicio hasta que la desactives.' : ''}</p></div>}
        {error && <p role="alert" className={styles.fieldError}>{error}</p>}
        {onReintentar && <button type="button" onClick={onReintentar} className={styles.button}>Reintentar carga</button>}
        {conflicto?.id_promocion && <div className={local.preview}><p>{conflicto.nombre || 'Hay una promoción que coincide con estas fechas.'}</p><Link className={styles.button} to={'/inventario/promociones?editar=' + conflicto.id_promocion} target="_blank" rel="noopener noreferrer">Abrir promoción existente (otra pestaña)</Link></div>}
        <div className={styles.dialogActions}><button type="button" onClick={cerrar} disabled={guardando} className={styles.button}>Cancelar</button><button type="submit" disabled={guardando} className={styles.button + ' ' + styles.primary}>{guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}{modoEdicion ? 'Guardar cambios' : 'Crear promoción'}</button></div>
      </form>}
    </div>
  </AccessibleDialog>;
}
