import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Coins,
  LoaderCircle,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Store,
  User,
  X,
} from 'lucide-react';
import { obtenerHistorialCompras } from '../../api/clientes';
import { formatearQuetzales } from '../../utils/pos';
import AccessibleDialog from '../ui/AccessibleDialog.jsx';
import styles from './ClienteDetailsModal.module.css';

const formatearFecha = (fecha) => {
  const fechaVenta = new Date(fecha);
  if (Number.isNaN(fechaVenta.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fechaVenta);
};

function Resumen({ resumen }) {
  const tarjetas = [
    { etiqueta: 'Compras completadas', valor: resumen.total_compras, Icono: ReceiptText },
    { etiqueta: 'Artículos adquiridos', valor: resumen.total_articulos, Icono: Package },
    { etiqueta: 'Monto acumulado', valor: formatearQuetzales(resumen.monto_total), Icono: Coins },
  ];

  return (
    <section className={styles.summaryGrid} aria-label="Resumen del historial">
      {tarjetas.map(({ etiqueta, valor, Icono }) => (
        <div key={etiqueta} className={styles.statCard}>
          <p className={styles.statLabel}><Icono size={15} aria-hidden="true" />{etiqueta}</p>
          <p className={styles.statValue}>{valor}</p>
        </div>
      ))}
    </section>
  );
}

function DetalleVenta({ detalles }) {
  if (!detalles?.length) {
    return <div className={styles.detail}><p className={styles.emptyContact}>Esta venta no tiene artículos disponibles para mostrar.</p></div>;
  }

  return (
    <div className={styles.detail}>
      <table className={styles.detailTable}>
        <caption className="sr-only">Productos incluidos en la venta</caption>
        <thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Precio</th><th scope="col">Subtotal</th></tr></thead>
        <tbody>
          {detalles.map((detalle) => (
            <tr key={detalle.id_detalle_venta}>
              <td data-label="Producto">
                <span className={styles.productName}>{detalle.nombre_comercial}</span>
                <span className={styles.productMeta}>{[detalle.codigo, detalle.concentracion, detalle.presentacion].filter(Boolean).join(' · ')}</span>
              </td>
              <td data-label="Cantidad" className={styles.number}>{detalle.cantidad}</td>
              <td data-label="Precio" className={styles.number}>{formatearQuetzales(detalle.precio_unitario)}</td>
              <td data-label="Subtotal" className={styles.number}><strong>{formatearQuetzales(detalle.subtotal)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VentaHistorial({ compra, expandida, onAlternar }) {
  const anulada = compra.estado === 'anulada';
  const cantidadArticulos = Number(compra.cantidad_articulos);

  return (
    <article className={styles.saleCard}>
      <div className={styles.saleMain}>
        <div className={styles.saleTop}>
          <div className={styles.saleIdentity}>
            <div className={styles.saleTitleRow}>
              <h4 className={styles.saleTitle}>Venta #{compra.id_venta}</h4>
              <span className={`${styles.status} ${anulada ? styles.statusCancelled : ''}`}>{anulada ? 'Anulada' : 'Completada'}</span>
            </div>
            <p className={styles.date}><CalendarDays size={14} aria-hidden="true" />{formatearFecha(compra.fecha_venta)}</p>
          </div>
          <div className={styles.saleAmount}>
            <strong>{formatearQuetzales(compra.total)}</strong>
            <span>{compra.cantidad_articulos} {cantidadArticulos === 1 ? 'artículo' : 'artículos'}</span>
          </div>
        </div>

        <div className={styles.saleBottom}>
          <div className={styles.saleMeta}>
            <span><Store size={14} aria-hidden="true" />{compra.nombre_sucursal}</span>
            <span><User size={14} aria-hidden="true" />{compra.nombre_usuario}</span>
            <span>Método: {compra.metodo_pago}</span>
          </div>
          <button type="button" onClick={onAlternar} aria-expanded={expandida} className={`${styles.button} ${styles.expandButton}`}>
            {expandida ? 'Ocultar detalle' : 'Ver detalle'}
            <ChevronDown size={15} className={`${styles.expandIcon} ${expandida ? styles.expandIconOpen : ''}`} aria-hidden="true" />
          </button>
        </div>

        {anulada && compra.motivo_anulacion && <p className={styles.cancelReason}>Motivo de anulación: {compra.motivo_anulacion}</p>}
      </div>
      {expandida && <DetalleVenta detalles={compra.detalles} />}
    </article>
  );
}

export default function HistorialClienteModal({ cliente, onClose }) {
  const [historial, setHistorial] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [ventaExpandida, setVentaExpandida] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!cliente) return undefined;

    let vigente = true;
    setCargando(true);
    setHistorial(null);
    setError(null);
    setVentaExpandida(null);

    obtenerHistorialCompras(cliente.id_cliente)
      .then((datos) => { if (vigente) setHistorial(datos); })
      .catch((err) => { if (vigente) setError(err.response?.data?.mensaje || 'No se pudo cargar el historial de ventas.'); })
      .finally(() => { if (vigente) setCargando(false); });

    return () => { vigente = false; };
  }, [cliente, intento]);

  const compras = historial?.compras || [];

  return (
    <AccessibleDialog
      open={Boolean(cliente)}
      labelledBy="titulo-historial-cliente"
      describedBy="descripcion-historial-cliente"
      onClose={onClose}
      size="large"
      className={styles.historyDialog}
    >
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <span className={styles.headingIcon}><ShoppingBag size={20} aria-hidden="true" /></span>
            <div>
              <p className={styles.eyebrow}>Actividad del cliente</p>
              <h2 id="titulo-historial-cliente">Historial de ventas</h2>
              <p id="descripcion-historial-cliente" className={styles.subtitle}>{cliente?.nombre_cliente}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.iconButton} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>

        <div className={styles.content}>
          {cargando && <div role="status" className={styles.state}><LoaderCircle size={26} className={styles.spinner} aria-hidden="true" /><strong>Cargando historial…</strong><span>Estamos consultando las compras asociadas.</span></div>}

          {!cargando && error && (
            <div role="alert" className={`${styles.state} ${styles.stateError}`}>
              <AlertCircle size={20} aria-hidden="true" />
              <strong>No se pudo cargar el historial</strong>
              <span>{error}</span>
              <button type="button" onClick={() => setIntento((actual) => actual + 1)} className={styles.button}><RefreshCw size={15} aria-hidden="true" /> Reintentar</button>
            </div>
          )}

          {!cargando && historial && (
            <>
              <Resumen resumen={historial.resumen} />
              {compras.length === 0 ? (
                <div className={styles.state}><ReceiptText size={26} aria-hidden="true" /><strong>Sin ventas registradas</strong><span>Este cliente todavía no tiene compras asociadas.</span></div>
              ) : (
                <section className={styles.salesSection} aria-labelledby="ventas-cliente-title">
                  <div className={styles.salesHeading}><h3 id="ventas-cliente-title">Ventas realizadas</h3><span>{compras.length} {compras.length === 1 ? 'registro' : 'registros'}</span></div>
                  <div className={styles.salesList}>
                    {compras.map((compra) => (
                      <VentaHistorial key={compra.id_venta} compra={compra} expandida={ventaExpandida === compra.id_venta} onAlternar={() => setVentaExpandida((actual) => (actual === compra.id_venta ? null : compra.id_venta))} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <footer className={styles.footer}><button type="button" onClick={onClose} className={styles.button}>Cerrar</button></footer>
      </div>
    </AccessibleDialog>
  );
}
