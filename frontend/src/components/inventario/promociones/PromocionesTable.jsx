import React from 'react';
import { Pencil, Power } from 'lucide-react';
import ContentState from '../../ui/ContentState.jsx';
import MenuAcciones from '../../ui/MenuAcciones.jsx';
import { formatearQuetzales } from '../../../utils/pos';
import { nombrePromocion, estadoPromocion, cantidadPromocion } from '../../../utils/promociones';
import styles from '../../../styles/ManagementUI.module.css';
import local from './Promociones.module.css';

const formato = new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
const fecha = (valor) => { const d = new Date(String(valor).slice(0, 10) + 'T00:00:00Z'); return Number.isNaN(d.getTime()) ? '—' : formato.format(d); };
const estados = { vigente: ['Vigente', styles.badgeActive], programada: ['Programada', ''], finalizada: ['Finalizada', styles.badgeWarning], desactivada: ['Desactivada', styles.badgeInactive], agotada: ['Cupo agotado', styles.badgeWarning] };

export default function PromocionesTable({ promociones = [], cargando, error, cambiandoId, onRetry, onEditar, onCambiarEstado, onCrear, onLimpiar, puedeGestionar = true }) {
  if (cargando) return <ContentState variant="loading" message="Cargando promociones…"/>;
  if (error) return <ContentState variant="error" title="No se pudieron cargar las promociones" message={error} onRetry={onRetry}/>;
  if (!promociones.length) return <div><ContentState title="No hay promociones que coincidan" message="Prueba otra búsqueda o cambia los filtros."/><div className={styles.rowActions}><button type="button" className={styles.button} onClick={onLimpiar}>Limpiar filtros</button>{puedeGestionar && <button type="button" className={styles.button} onClick={onCrear}>Crear promoción</button>}</div></div>;
  return <section className={styles.tablePanel} aria-label="Listado de promociones">
    <table className={styles.table + ' ' + local.table}><caption className={styles.visuallyHidden}>Promociones por producto y sucursal</caption>
      <thead><tr><th scope="col">Promoción / Producto</th><th scope="col">Sucursal</th><th scope="col">Condición</th><th scope="col" className={local.number}>Precio por unidad</th><th scope="col">Vigencia</th>{puedeGestionar && <th scope="col">Acciones</th>}</tr></thead>
      <tbody>{promociones.map((p) => { const [estado, clase] = estados[estadoPromocion(p)]; return <tr key={p.id_promocion}>
        <td data-label="Promoción / Producto"><div className={local.identity}><strong>{nombrePromocion(p)}</strong><span>{[p.nombre_comercial, p.concentracion, p.presentacion, p.codigo].filter(Boolean).join(' · ')}</span></div></td>
        <td data-label="Sucursal">{p.nombre_sucursal}</td>
        <td data-label="Condición"><div className={local.identity}><span>Desde {cantidadPromocion(p.cantidad_minima)} por venta</span>{p.cantidad_maxima == null ? <span>Sin límite acumulado</span> : <><strong>{cantidadPromocion(p.cantidad_disponible ?? 0)} disponibles de {new Intl.NumberFormat('es-GT').format(p.cantidad_maxima)}</strong><span>{cantidadPromocion(p.cantidad_vendida ?? 0)} vendidas{Number(p.cantidad_reservada) > 0 ? ' · ' + cantidadPromocion(p.cantidad_reservada) + ' reservadas' : ''}</span></>}</div></td>
        <td data-label="Precio por unidad" className={local.number}>{formatearQuetzales(p.precio_promocion)}</td>
        <td data-label="Vigencia"><div><span>{fecha(p.fecha_inicio)} – {p.fecha_fin ? fecha(p.fecha_fin) : 'Sin fecha de fin'}</span><div className={local.state}><span className={styles.badge + ' ' + clase}>{estado}</span></div></div></td>
        {puedeGestionar && <td data-label="Acciones" className={styles.actionsCell}><div className={styles.rowActions + ' ' + local.actions}><MenuAcciones etiqueta={'Más acciones para ' + nombrePromocion(p)} ocupado={Number(cambiandoId) === Number(p.id_promocion)} acciones={[{ clave: 'editar', etiqueta: 'Editar', icono: Pencil, onClick: () => onEditar(p) }, { clave: 'estado', etiqueta: p.activo ? 'Desactivar' : 'Activar', icono: Power, peligro: p.activo, onClick: () => onCambiarEstado(p) }]} /></div></td>}
      </tr>; })}</tbody>
    </table>
  </section>;
}
