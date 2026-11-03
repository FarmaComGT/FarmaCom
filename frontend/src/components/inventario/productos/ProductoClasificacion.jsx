import React from 'react';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProductoClasificacion({ formulario, categorias, casas, proveedores, cargandoDatos, onChange }) {
  return (
    <section className={styles.section} aria-labelledby="producto-clasificacion-title">
      <h3 id="producto-clasificacion-title" className={styles.sectionHeading}>Clasificación y abastecimiento</h3>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="id_categoria">Categoría</label>
          <select id="id_categoria" name="id_categoria" value={formulario.id_categoria} onChange={onChange} required disabled={cargandoDatos} className={styles.input}>
            <option value="">{cargandoDatos ? 'Cargando categorías…' : 'Selecciona una categoría'}</option>
            {(categorias || []).map((categoria) => <option key={categoria.id_categoria} value={categoria.id_categoria}>{categoria.nombre}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="id_casa">Casa farmacéutica</label>
          <select id="id_casa" name="id_casa" value={formulario.id_casa} onChange={onChange} required disabled={cargandoDatos} className={styles.input}>
            <option value="">{cargandoDatos ? 'Cargando casas…' : 'Selecciona una casa'}</option>
            {(casas || []).filter((casa) => casa.activo || String(casa.id_casa) === String(formulario.id_casa)).map((casa) => <option key={casa.id_casa} value={casa.id_casa}>{casa.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="id_proveedor">Proveedor <span className={styles.optional}>(opcional)</span></label>
        <select id="id_proveedor" name="id_proveedor" value={formulario.id_proveedor} onChange={onChange} disabled={cargandoDatos} className={styles.input}>
          <option value="">Sin proveedor predeterminado</option>
          {(proveedores || []).filter((proveedor) => proveedor.activo || String(proveedor.id_proveedor) === String(formulario.id_proveedor)).map((proveedor) => <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>{proveedor.nombre}</option>)}
        </select>
        <p className={styles.helpText}>Podrás elegir otro proveedor al ingresar cada lote.</p>
      </div>
    </section>
  );
}
