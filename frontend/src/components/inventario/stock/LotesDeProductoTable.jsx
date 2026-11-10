import React from 'react';
import { Pencil, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import usePaginacionURL, { leerPaginacionURL } from '../../../hooks/usePaginacionURL.js';
import Paginacion from '../../ui/Paginacion.jsx';
import ContentState from '../../ui/ContentState.jsx';
import MenuAcciones from '../../ui/MenuAcciones.jsx';
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
  const [params] = useSearchParams();
  const { pagina, limite } = leerPaginacionURL(params);
  const { lotes, paginacion, cargando, error, refrescar } = useLotesProducto(producto.id_producto, {
    enabled: activo && Boolean(sucursalId), refreshKey, pagina, limite,
    id_sucursal: sucursalId, estado_stock: filtroStock, estado_vencimiento: filtroVencimiento,
  });
  const { crearDestino, onLimiteChange } = usePaginacionURL({ paginacion, cargando });
  const mostrarAcciones = Boolean(onEditar || onEliminar || onAjustar);

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
            <MenuAcciones
              etiqueta={`Más acciones para el lote ${lote.numero_lote}`}
              acciones={[
                { clave: 'ajustar', etiqueta: 'Ajustar stock…', icono: SlidersHorizontal, oculta: !onAjustar, onClick: () => onAjustar(lote) },
                { clave: 'editar', etiqueta: 'Editar lote…', icono: Pencil, oculta: !onEditar, onClick: () => onEditar(lote) },
                { clave: 'eliminar', etiqueta: 'Eliminar lote…', icono: Trash2, peligro: true, separadorAntes: true, oculta: !onEliminar, onClick: () => onEliminar(lote) },
              ]}
            />
          </div>
        </td>
      )}
    </tr>
  );

  if (cargando) return <ContentState variant="loading" message="Cargando lotes…" compact />;
  if (error) return <ContentState variant="error" message={error} onRetry={refrescar} compact />;
  if (lotes.length === 0) {
    const hayFiltros = Boolean(filtroStock || filtroVencimiento);
    return (
      <section id="lotes-producto" aria-label="Lotes del producto"><ContentState
        title={hayFiltros ? 'No hay coincidencias' : 'Este producto todavía no tiene lotes en la sucursal.'}
        message={hayFiltros ? 'Cambia o limpia los filtros para ver otros lotes.' : 'Usa “Agregar lote” para registrar las primeras existencias.'}
        compact
      /><Paginacion paginacion={paginacion} crearDestino={crearDestino} onLimiteChange={onLimiteChange}
        sustantivo="lotes" controles="lotes-producto" /></section>
    );
  }

  return (
    <section id="lotes-producto" className={styles.tablePanel} aria-label="Lotes del producto">
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
          {lotes.map(fila)}
        </tbody>
      </table>
      <Paginacion paginacion={paginacion} crearDestino={crearDestino} onLimiteChange={onLimiteChange}
        sustantivo="lotes" controles="lotes-producto" />
    </section>
  );
}
