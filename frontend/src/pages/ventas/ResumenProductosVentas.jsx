import React, { useEffect, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useResumenProductos } from '../../hooks/useHistorialVentas';
import { formatearMoneda, formatearNumero } from '../../utils/reportes';
import ContentState from '../../components/ui/ContentState';
import Paginacion from '../../components/ui/Paginacion';
import usePaginacionURL, { leerPaginacionURL } from '../../hooks/usePaginacionURL';
import ui from '../../styles/ManagementUI.module.css';
import styles from './HistorialVentas.module.css';

const PREFIJO_PAGINACION = 'productos_';
const ENCABEZADOS = ['Producto', 'Unidades vendidas', 'Ingresos generados'];

function TablaResumenCargando() {
  return (
    <div role="status" aria-label="Cargando resumen por producto" className={styles.loadingTable}>
      <table className={`${ui.table} ${styles.productTable}`} aria-hidden="true">
        <thead><tr>{ENCABEZADOS.map((encabezado) => <th key={encabezado}>{encabezado}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: 5 }, (_, indice) => (
            <tr key={indice}>{ENCABEZADOS.map((encabezado) => <td key={encabezado}><span className={styles.skeleton} /></td>)}</tr>
          ))}
        </tbody>
      </table>
      <span className={ui.visuallyHidden}>Cargando resumen por producto…</span>
    </div>
  );
}

export default function ResumenProductosVentas() {
  const { filtros } = useOutletContext();
  const [params] = useSearchParams();
  const { pagina, limite } = leerPaginacionURL(params, PREFIJO_PAGINACION);
  const { datos, cargando, error, recargar } = useResumenProductos(filtros);

  useEffect(() => { document.title = 'Resumen de productos vendidos · FarmaCom'; }, []);

  const totales = useMemo(() => datos.reduce((acumulado, producto) => ({
    cantidad: acumulado.cantidad + Number(producto.cantidad_vendida || 0),
    suma: acumulado.suma + Number(producto.suma_total || 0),
  }), { cantidad: 0, suma: 0 }), [datos]);

  const totalPaginas = Math.max(1, Math.ceil(datos.length / limite));
  const paginaEfectiva = Math.min(pagina, totalPaginas);
  const paginacion = {
    pagina: paginaEfectiva,
    limite,
    total: datos.length,
    total_paginas: totalPaginas,
  };
  const { crearDestino, onLimiteChange } = usePaginacionURL({
    prefijo: PREFIJO_PAGINACION,
    paginacion,
    cargando,
  });
  const inicio = (paginaEfectiva - 1) * limite;
  const productosPagina = datos.slice(inicio, inicio + limite);

  return (
    <section id="resumen-productos-vendidos" aria-labelledby="titulo-resumen-productos" aria-busy={cargando}>
      <div className={styles.resultsHeader}>
        <div className={styles.sectionIntro}>
          <h2 id="titulo-resumen-productos" className={styles.sectionHeading}>Resumen por producto</h2>
          <p>Acumulado de unidades e ingresos para el período consultado.</p>
        </div>
        {!cargando && !error && (
          <p className={ui.resultCount} aria-live="polite">
            <strong>{formatearNumero(datos.length)}</strong> {datos.length === 1 ? 'producto' : 'productos'}
          </p>
        )}
      </div>

      {cargando && <TablaResumenCargando />}
      {!cargando && error && (
        <ContentState
          compact
          variant="error"
          title="No se pudo cargar el resumen"
          message={error}
          onRetry={recargar}
        />
      )}
      {!cargando && !error && datos.length === 0 && (
        <ContentState
          compact
          title="No hay productos vendidos en el período seleccionado."
          message="Prueba con otra sucursal o amplía el rango de fechas."
        />
      )}
      {!cargando && !error && datos.length > 0 && (
        <>
          <dl className={`${ui.summary} ${styles.productSummary}`} aria-label="Totales de productos vendidos">
            <div className={ui.stat}>
              <dt>Productos vendidos</dt>
              <dd>{formatearNumero(datos.length)}</dd>
            </div>
            <div className={ui.stat}>
              <dt>Unidades vendidas</dt>
              <dd>{formatearNumero(totales.cantidad)}</dd>
            </div>
            <div className={ui.stat}>
              <dt>Ingresos generados</dt>
              <dd>{formatearMoneda(totales.suma)}</dd>
            </div>
          </dl>

          <div className={ui.tablePanel}>
            <table className={`${ui.table} ${styles.productTable}`}>
              <thead>
                <tr>{ENCABEZADOS.map((encabezado) => <th key={encabezado} scope="col">{encabezado}</th>)}</tr>
              </thead>
              <tbody>
                {productosPagina.map((producto) => (
                  <tr key={producto.id_producto}>
                    <td data-label="Producto">
                      <strong className={styles.productName}>{producto.nombre_producto || 'Producto sin nombre'}</strong>
                      <span className={styles.secondaryLine}>Producto #{producto.id_producto}</span>
                    </td>
                    <td data-label="Unidades vendidas" className={styles.numberCell}>
                      {formatearNumero(producto.cantidad_vendida)}
                    </td>
                    <td data-label="Ingresos generados" className={`${styles.numberCell} ${ui.price}`}>
                      {formatearMoneda(producto.suma_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!error && datos.length > 0 && (
        <Paginacion
          paginacion={paginacion}
          crearDestino={crearDestino}
          onLimiteChange={onLimiteChange}
          cargando={cargando}
          sustantivo="productos"
          etiqueta="Paginación del resumen por producto"
          controles="resumen-productos-vendidos"
        />
      )}
    </section>
  );
}
