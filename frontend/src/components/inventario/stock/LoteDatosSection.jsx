import React from 'react';
import styles from '../../../styles/ManagementUI.module.css';

export default function LoteDatosSection({
  formulario, productos, proveedores, sucursales, presentacion, modoEdicion,
  bloquearProducto, cargandoDatos, fechaMinima, onChange, onPrecioChange,
}) {
  return (
    <section className={styles.section} aria-labelledby="lote-datos-title">
      <h3 id="lote-datos-title" className={styles.sectionHeading}>Identificación y ubicación</h3>
      <div className={styles.field}>
        <label htmlFor="producto_lote" className="campo-requerido">Producto</label>
        <select id="producto_lote" name="id_producto" value={formulario.id_producto} onChange={onChange} disabled={cargandoDatos || bloquearProducto} required className={styles.input}>
          <option value="">{cargandoDatos ? 'Cargando productos…' : 'Selecciona un producto'}</option>
          {productos.map((producto) => <option key={producto.id_producto} value={producto.id_producto}>{producto.nombre_comercial}{producto.concentracion ? ` ${producto.concentracion}` : ''}{producto.presentacion ? ` · ${producto.presentacion}` : ''} — {producto.codigo}</option>)}
        </select>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="id_sucursal_lote" className="campo-requerido">Sucursal</label>
          <select id="id_sucursal_lote" name="id_sucursal" value={formulario.id_sucursal} onChange={onChange} disabled={cargandoDatos} required className={styles.input}>
            <option value="">Selecciona una sucursal</option>
            {(sucursales || []).map((item) => <option key={item.id_sucursal} value={item.id_sucursal}>{item.nombre_sucursal}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="id_proveedor_lote" className="campo-requerido">Proveedor</label>
          <select id="id_proveedor_lote" name="id_proveedor" value={formulario.id_proveedor} onChange={onChange} disabled={cargandoDatos} required className={styles.input}>
            <option value="">Selecciona un proveedor</option>
            {(proveedores || []).filter((item) => item.activo || String(item.id_proveedor) === String(formulario.id_proveedor)).map((item) => <option key={item.id_proveedor} value={item.id_proveedor}>{item.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="numero_lote" className={modoEdicion ? 'campo-requerido' : undefined}>Número de lote</label>
          <input id="numero_lote" type="text" name="numero_lote" autoComplete="off" value={formulario.numero_lote} onChange={onChange} placeholder={modoEdicion ? 'Ej.: LT-2026-001…' : 'Se genera al guardar…'} maxLength={100} required={modoEdicion} className={styles.input} />
          {!modoEdicion && <p className={styles.helpText}>Déjalo vacío para generar un número interno o escribe el lote del fabricante.</p>}
        </div>
        <div className={styles.field}>
          <label htmlFor="fecha_vencimiento_lote">Vencimiento <span className={styles.optional}>(opcional)</span></label>
          <input id="fecha_vencimiento_lote" type="date" name="fecha_vencimiento" value={formulario.fecha_vencimiento} onChange={onChange} min={fechaMinima} className={styles.input} aria-describedby="vencimiento-ayuda" />
          <p id="vencimiento-ayuda" className={styles.helpText}>Déjalo vacío cuando el producto no tenga fecha de vencimiento.</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="cantidad_ingresada_lote" className="campo-requerido">Cantidad ingresada</label>
          <input id="cantidad_ingresada_lote" type="number" inputMode="numeric" name="cantidad_ingresada" value={formulario.cantidad_ingresada} onChange={onChange} placeholder="Ej.: 20…" min="1" step="1" required disabled={modoEdicion} className={styles.input} />
          {modoEdicion && <p className={styles.helpText}>La cantidad de ingreso es un dato histórico y no se sobrescribe.</p>}
        </div>
        {modoEdicion ? (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Existencias</span>
            <p className={styles.identity}>Existencias actuales: {formulario.stock_actual}</p>
            <p className={styles.helpText}>Usa “Ajustar stock…” para corregirlas con un motivo y conservar la trazabilidad.</p>
          </div>
        ) : (
          <div className={styles.field}>
            <label htmlFor="presentacion_lote">Presentación</label>
            <input id="presentacion_lote" type="text" value={presentacion || 'Depende del producto seleccionado'} disabled className={styles.input} />
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="precio_compra_lote" className="campo-requerido">Precio de compra (Q)</label>
        <input id="precio_compra_lote" type="number" inputMode="decimal" name="precio_compra" value={formulario.precio_compra} onChange={(evento) => onPrecioChange('precio_compra', evento.target.value)} min="0" step="0.01" required placeholder="Ej.: 10.50…" className={styles.input} />
        <p className={styles.helpText}>Costo unitario real de este ingreso; se conserva para este lote.</p>
      </div>
    </section>
  );
}
