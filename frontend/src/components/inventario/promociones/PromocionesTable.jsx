import React from 'react';
import { Pencil, Power } from 'lucide-react';
import ContentState from '../../ui/ContentState.jsx';
import { formatearQuetzales } from '../../../utils/pos';
import styles from '../../../styles/ManagementUI.module.css';

const formateadorFecha = new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

const formatearFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(`${String(valor).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? '—' : formateadorFecha.format(fecha);
};

const estadoVigencia = (promocion) => {
  if (!promocion.activo) return { texto: 'Inactiva', clase: styles.badgeInactive };
  const ahora = new Date();
  const hoy = [ahora.getFullYear(), String(ahora.getMonth() + 1).padStart(2, '0'), String(ahora.getDate()).padStart(2, '0')].join('-');
  const inicio = String(promocion.fecha_inicio).slice(0, 10);
  const fin = String(promocion.fecha_fin).slice(0, 10);
  if (hoy < inicio) return { texto: 'Programada', clase: '' };
  if (hoy > fin) return { texto: 'Finalizada', clase: styles.badgeWarning };
  return { texto: 'Vigente', clase: styles.badgeActive };
};

export default function PromocionesTable({ promociones, cargando, error, productoSeleccionado, hayFiltroSucursal, cambiandoId, onRetry, onEditar, onCambiarEstado }) {
  if (!productoSeleccionado) return <ContentState title="Selecciona un producto" message="Elige un producto para consultar y administrar sus promociones." />;
  if (cargando && promociones.length === 0) return <ContentState variant="loading" message="Cargando promociones…" />;
  if (error && promociones.length === 0) return <ContentState variant="error" title="No se pudieron cargar las promociones" message={error} onRetry={onRetry} />;
  if (promociones.length === 0) return <ContentState title={hayFiltroSucursal ? 'Sin promociones en esta sucursal' : 'Aún no hay promociones'} message={hayFiltroSucursal ? 'Prueba con otra sucursal o muestra todas.' : 'Crea la primera promoción para este producto.'} />;

  return (
    <section className={styles.tablePanel} aria-label="Promociones del producto seleccionado">
      <table className={styles.table} aria-busy={cargando}>
        <caption className={styles.visuallyHidden}>Listado de promociones por sucursal</caption>
        <thead>
          <tr>
            <th scope="col">Sucursal</th>
            <th scope="col" style={{ width: '18%' }}>Condición</th>
            <th scope="col" style={{ width: '15%' }}>Precio</th>
            <th scope="col" style={{ width: '24%' }}>Vigencia</th>
            <th scope="col" style={{ width: '18%', textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {promociones.map((promocion) => {
            const estado = estadoVigencia(promocion);
            const procesando = Number(cambiandoId) === Number(promocion.id_promocion);
            return (
              <tr key={promocion.id_promocion}>
                <th scope="row" data-label="Sucursal">
                  <span className={styles.identity}>{promocion.nombre_sucursal}</span>
                  <span className={`${styles.badge} ${estado.clase}`}>{estado.texto}</span>
                </th>
                <td data-label="Condición" className={styles.secondary}>Desde {new Intl.NumberFormat('es-GT').format(promocion.cantidad_minima)} unidades</td>
                <td data-label="Precio" className={`${styles.mono} ${styles.price}`}>{formatearQuetzales(promocion.precio_promocion)}</td>
                <td data-label="Vigencia" className={styles.secondary}>{formatearFecha(promocion.fecha_inicio)} – {formatearFecha(promocion.fecha_fin)}</td>
                <td data-label="Acciones" className={styles.actionsCell}>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => onEditar(promocion)} className={styles.button} aria-label={`Editar promoción ${promocion.id_promocion}`}><Pencil size={15} aria-hidden="true" />Editar</button>
                    <button type="button" onClick={() => onCambiarEstado(promocion)} disabled={procesando} className={`${styles.button} ${promocion.activo ? styles.danger : ''}`} aria-label={`${promocion.activo ? 'Desactivar' : 'Activar'} promoción ${promocion.id_promocion}`}><Power size={15} aria-hidden="true" />{promocion.activo ? 'Desactivar' : 'Activar'}</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
