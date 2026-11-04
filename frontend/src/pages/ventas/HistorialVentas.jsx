import React, { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useVentas } from '../../hooks/useHistorialVentas';
import { formatearMoneda } from '../../utils/reportes';
import VentaDetalleModal from '../../components/ventas/historial/VentaDetalleModal';
import ContentState from '../../components/ui/ContentState';
import Paginacion from '../../components/ui/Paginacion';
import usePaginacionURL, { leerPaginacionURL } from '../../hooks/usePaginacionURL';
import ui from '../../styles/ManagementUI.module.css';
import styles from './HistorialVentas.module.css';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Guatemala',
});
const FORMATO_NUMERO = new Intl.NumberFormat('es-GT');

const formatearFecha = (valor) => {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '—' : FORMATO_FECHA.format(fecha);
};

const capitalizar = (valor) => {
  const texto = String(valor || 'No disponible').replaceAll('_', ' ');
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
};

const encabezados = ['Venta / fecha', 'Sucursal / responsable', 'Cliente', 'Artículos', 'Pago', 'Total', 'Estado', 'Acciones'];

function TablaCargando() {
  return (
    <div role="status" aria-label="Cargando historial de ventas" className={styles.loadingTable}>
      <table className={`${ui.table} ${styles.salesTable}`} aria-hidden="true">
        <thead><tr>{encabezados.map((titulo) => <th key={titulo}>{titulo}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: 4 }, (_, indice) => (
            <tr key={indice}>{encabezados.map((titulo) => <td key={titulo}><span className={styles.skeleton} /></td>)}</tr>
          ))}
        </tbody>
      </table>
      <span className={ui.visuallyHidden}>Cargando historial de ventas…</span>
    </div>
  );
}

export default function HistorialVentas() {
  const { filtros } = useOutletContext();
  const [params] = useSearchParams();
  const { pagina, limite } = leerPaginacionURL(params);
  const { datos, paginacion, cargando, error, recargar } = useVentas({ ...filtros, pagina, limite });
  const { crearDestino, onLimiteChange } = usePaginacionURL({ paginacion, cargando });
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  useEffect(() => { document.title = 'Historial de ventas · FarmaCom'; }, []);

  const total = paginacion?.total ?? datos.length;

  return (
    <>
      <section id="historial-ventas" aria-labelledby="titulo-listado-ventas" aria-busy={cargando}>
        <div className={styles.resultsHeader}>
          <h2 id="titulo-listado-ventas" className={styles.sectionHeading}>Ventas registradas</h2>
          {!cargando && !error && (
            <p className={ui.resultCount} aria-live="polite">
              <strong>{FORMATO_NUMERO.format(total)}</strong> {total === 1 ? 'venta' : 'ventas'}
            </p>
          )}
        </div>

        {cargando && <TablaCargando />}
        {!cargando && error && (
          <ContentState
            compact
            variant="error"
            title="No se pudo cargar el historial"
            message={error}
            onRetry={recargar}
          />
        )}
        {!cargando && !error && datos.length === 0 && (
          <ContentState
            compact
            title="No hay ventas en el período seleccionado."
            message="Prueba con otra sucursal o amplía el rango de fechas."
          />
        )}
        {!cargando && !error && datos.length > 0 && (
          <div className={ui.tablePanel}>
            <table className={`${ui.table} ${styles.salesTable}`}>
              <thead>
                <tr>
                  {encabezados.map((titulo) => <th key={titulo} scope="col">{titulo}</th>)}
                </tr>
              </thead>
              <tbody>
                {datos.map((venta) => (
                  <tr key={venta.id_venta}>
                    <td data-label="Venta / fecha">
                      <strong className={styles.saleId}>#{venta.id_venta}</strong>
                      <span className={styles.secondaryLine}>{formatearFecha(venta.fecha_venta)}</span>
                    </td>
                    <td data-label="Sucursal / responsable">
                      <strong className={styles.primaryLine}>{venta.nombre_sucursal || 'Sin sucursal'}</strong>
                      <span className={styles.secondaryLine}>Atendió: {venta.nombre_usuario || 'No disponible'}</span>
                    </td>
                    <td data-label="Cliente">{venta.nombre_cliente || 'Consumidor final'}</td>
                    <td data-label="Artículos" className={styles.numberCell}>
                      {FORMATO_NUMERO.format(Number(venta.cantidad_articulos || 0))}
                    </td>
                    <td data-label="Pago">{capitalizar(venta.metodo_pago)}</td>
                    <td data-label="Total" className={`${styles.numberCell} ${ui.price}`}>
                      {formatearMoneda(venta.total)}
                    </td>
                    <td data-label="Estado">
                      <span className={`${ui.badge} ${venta.estado === 'anulada' ? ui.badgeDanger : ui.badgeActive}`}>
                        {capitalizar(venta.estado)}
                      </span>
                    </td>
                    <td data-label="Acciones" className={ui.actionsCell}>
                      <div className={ui.rowActions}>
                        <button
                          type="button"
                          aria-label={`Ver detalle de venta ${venta.id_venta}`}
                          onClick={() => setVentaSeleccionada(venta.id_venta)}
                          className={ui.button}
                        >
                          <Eye size={16} aria-hidden="true" /> Ver detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && (
          <Paginacion
            paginacion={paginacion}
            crearDestino={crearDestino}
            onLimiteChange={onLimiteChange}
            cargando={cargando}
            sustantivo="ventas"
            controles="historial-ventas"
          />
        )}
      </section>

      <VentaDetalleModal
        idVenta={ventaSeleccionada}
        onClose={() => setVentaSeleccionada(null)}
        onVentaAnulada={recargar}
      />
    </>
  );
}
