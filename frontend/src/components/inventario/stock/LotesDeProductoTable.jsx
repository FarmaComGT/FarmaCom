import React, { useMemo, useState } from 'react';
import { ChevronDown, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react';
import ContentState from '../../ui/ContentState.jsx';
import EstadoBadge from './EstadoBadge.jsx';
import useLotesProducto from '../../../hooks/useLotesProducto.js';
import { pluralizarPresentacion } from '../../../constants/presentaciones.js';
import styles from '../../../styles/ManagementUI.module.css';

const formatoFecha = (valor) => {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(valor));
};

const formatoNumero = (valor, decimales = 4) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: decimales }).format(numero);
};

const formatoMoneda = (valor) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(numero);
};

const obtenerEstadoLote = (lote) => {
  if (lote.estado_vencimiento && lote.estado_vencimiento !== 'normal') return lote.estado_vencimiento;
  if (lote.estado_stock && lote.estado_stock !== 'normal') return lote.estado_stock;
  return 'normal';
};

export default function LotesDeProductoTable({
  producto, sucursalId, activo, onEditar, onEliminar, onAjustar, refreshKey,
  filtroStock = '', filtroVencimiento = '',
}) {
  const [mostrarAgotados, setMostrarAgotados] = useState(false);
  const { lotes, cargando, error, refrescar } = useLotesProducto(producto.id_producto, { enabled: activo, refreshKey });
  const mostrarAcciones = Boolean(onEditar || onEliminar || onAjustar);
  const lotesSucursal = useMemo(() => lotes.filter((lote) => (
    String(lote.id_sucursal) === String(sucursalId)
    && (!filtroStock || lote.estado_stock === filtroStock)
    && (!filtroVencimiento || lote.estado_vencimiento === filtroVencimiento)
  )), [filtroStock, filtroVencimiento, lotes, sucursalId]);
  const lotesConExistencias = lotesSucursal.filter((lote) => Number(lote.stock_actual) > 0);
  const lotesAgotados = lotesSucursal.filter((lote) => Number(lote.stock_actual) <= 0);
  const agotadosVisibles = mostrarAgotados || filtroStock === 'agotado';

  const fila = (lote) => (
    <tr key={lote.id_lote}>
      <td data-label="Lote">
        <span className={styles.identity}>{lote.numero_lote}</span>
        <span className={styles.secondary}>{lote.presentacion || 'Sin presentación'}</span>
      </td>
      <td data-label="Ingreso" className={styles.mono}>{formatoFecha(lote.fecha_ingreso)}</td>
      <td data-label="Vencimiento" className={styles.mono}>{formatoFecha(lote.fecha_vencimiento)}</td>
      <td data-label="Stock" className={styles.mono}>
        <span className={styles.identity}>{formatoNumero(lote.stock_actual)}</span>
        <span className={styles.secondary}>{pluralizarPresentacion(lote.presentacion)}</span>
      </td>
      <td data-label="Estado"><EstadoBadge estado={obtenerEstadoLote(lote)} /></td>
      <td data-label="Precio" className={styles.mono}>
        <span className={styles.identity}>{formatoMoneda(lote.precio_venta)}</span>
        {lote.precio_mayoreo != null && <span className={styles.secondary}>Mayoreo: {formatoMoneda(lote.precio_mayoreo)}</span>}
      </td>
      {mostrarAcciones && (
        <td data-label="Acciones" className={styles.actionsCell}>
          <div className={styles.rowActions}>
            {onAjustar && <button type="button" onClick={() => onAjustar(lote)} className={`${styles.button} ${styles.iconButton}`} aria-label={`Ajustar stock del lote ${lote.numero_lote}`} title="Ajustar stock…">
              <SlidersHorizontal size={15} aria-hidden="true" />
            </button>}
            {onEditar && <button type="button" onClick={() => onEditar(lote)} className={`${styles.button} ${styles.iconButton}`} aria-label={`Editar lote ${lote.numero_lote}`} title="Editar lote…">
              <Pencil size={15} aria-hidden="true" />
            </button>}
            {onEliminar && <button type="button" onClick={() => onEliminar(lote)} className={`${styles.button} ${styles.iconButton} ${styles.danger}`} aria-label={`Eliminar lote ${lote.numero_lote}`} title="Eliminar lote…">
              <Trash2 size={15} aria-hidden="true" />
            </button>}
          </div>
        </td>
      )}
    </tr>
  );

  if (cargando) return <ContentState variant="loading" message="Cargando lotes…" compact />;
  if (error) return <ContentState variant="error" message={error} onRetry={refrescar} compact />;
  if (lotesSucursal.length === 0) {
    const hayFiltros = Boolean(filtroStock || filtroVencimiento);
    return (
      <ContentState
        title={hayFiltros ? 'No hay coincidencias' : 'Este producto todavía no tiene lotes en la sucursal.'}
        message={hayFiltros ? 'Cambia o limpia los filtros para ver otros lotes.' : 'Usa “Agregar lote” para registrar las primeras existencias.'}
        compact
      />
    );
  }

  return (
    <section className={styles.tablePanel} aria-label="Lotes del producto">
      <table className={styles.table}>
        <caption className={styles.visuallyHidden}>Lotes del producto en la sucursal seleccionada</caption>
        <thead>
          <tr>
            <th scope="col">Lote</th><th scope="col">Ingreso</th><th scope="col">Vencimiento</th>
            <th scope="col">Stock</th><th scope="col">Estado</th><th scope="col">Precio</th>
            {mostrarAcciones && <th scope="col">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {lotesConExistencias.map(fila)}
          {lotesConExistencias.length === 0 && filtroStock !== 'agotado' && (
            <tr><td colSpan={mostrarAcciones ? 7 : 6} className={styles.empty}><strong>No hay lotes con existencias en esta sucursal.</strong></td></tr>
          )}
          {lotesAgotados.length > 0 && filtroStock !== 'agotado' && (
            <tr>
              <td colSpan={mostrarAcciones ? 7 : 6}>
                <button type="button" aria-expanded={mostrarAgotados} onClick={() => setMostrarAgotados((valor) => !valor)} className={styles.button}>
                  {mostrarAgotados ? 'Ocultar' : 'Ver'} lotes agotados ({lotesAgotados.length})
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
              </td>
            </tr>
          )}
          {agotadosVisibles && lotesAgotados.map(fila)}
        </tbody>
      </table>
    </section>
  );
}
