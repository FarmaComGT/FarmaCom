import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../../../api/axios';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import styles from '../../../styles/ManagementUI.module.css';

export default function ProductoDetalleModal({ idProducto, destinoLotes, onClose }) {
  const [producto, setProducto] = useState(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!idProducto) return;
    let vigente = true;
    setProducto(null);
    setError('');
    api.get(`/productos/${idProducto}`).then(({ data }) => {
      if (vigente) setProducto(data);
    }).catch(() => {
      if (vigente) setError('No se pudo cargar el producto. Intenta nuevamente.');
    });
    return () => { vigente = false; };
  }, [idProducto, intento]);

  const campos = producto ? [
    ['Código', producto.codigo], ['Código de barras', producto.codigo_barras],
    ['Nombre comercial', producto.nombre_comercial], ['Nombre genérico', producto.nombre_generico],
    ['Concentración', producto.concentracion], ['Presentación', producto.presentacion],
    ['Categoría', producto.categoria_nombre], ['Casa farmacéutica', producto.casa_nombre],
    ['Descripción', producto.descripcion],
    ['Stock mínimo', new Intl.NumberFormat('es-GT').format(producto.stock_minimo ?? 0)],
    ['Alerta de vencimiento', producto.meses_alerta_vencimiento == null ? null : `${new Intl.NumberFormat('es-GT').format(producto.meses_alerta_vencimiento)} meses (solo lotes con vencimiento)`],
    ['Estado', <span className={`${styles.badge} ${producto.activo ? styles.badgeActive : styles.badgeDanger}`}>{producto.activo ? 'Activo' : 'Inactivo'}</span>],
  ] : [];
  return (
    <AccessibleDialog open={Boolean(idProducto)} labelledBy="producto-detalle-titulo" onClose={onClose} size="large">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <h2 id="producto-detalle-titulo">Información del producto</h2>
          <button type="button" onClick={onClose} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        {error ? <div role="alert"><p>{error}</p><button type="button" className={styles.button} onClick={() => setIntento((valor) => valor + 1)}>Reintentar</button></div>
          : !producto ? <p role="status">Cargando producto…</p>
            : <dl className={styles.formGrid}>{campos.map(([nombre, valor]) => <div key={nombre} className={styles.field} style={{ minWidth: 0, overflowWrap: 'anywhere' }}><dt className={styles.fieldLabel}><strong>{nombre}</strong></dt><dd>{valor || 'Sin especificar'}</dd></div>)}</dl>}
        <div className={styles.dialogActions}>
          <button type="button" onClick={onClose} className={styles.button}>Cerrar</button>
          <Link to={destinoLotes} className={`${styles.button} ${styles.primary}`}>Ver lotes</Link>
        </div>
      </div>
    </AccessibleDialog>
  );
}
