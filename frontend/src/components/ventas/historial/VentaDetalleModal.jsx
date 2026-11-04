import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CreditCard,
  X,
} from 'lucide-react';
import { anularVenta, obtenerVentaPorId } from '../../../api/ventas';
import AccessibleDialog from '../../ui/AccessibleDialog';
import ContentState from '../../ui/ContentState';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { formatearMoneda } from '../../../utils/reportes';
import ui from '../../../styles/ManagementUI.module.css';
import styles from '../../../pages/ventas/HistorialVentas.module.css';
import VentaAnularModal from './VentaAnularModal';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Guatemala',
});
const FORMATO_NUMERO = new Intl.NumberFormat('es-GT');

const formatearFecha = (valor) => {
  if (!valor) return 'No disponible';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 'No disponible' : FORMATO_FECHA.format(fecha);
};

const capitalizar = (valor) => {
  const texto = String(valor || 'No disponible').replaceAll('_', ' ');
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
};

export default function VentaDetalleModal({ idVenta, onClose, onVentaAnulada }) {
  const toast = useToast();
  const { usuario } = useAuth();
  const [estado, setEstado] = useState({ venta: null, cargando: false, error: null });
  const [intento, setIntento] = useState(0);
  const [modalAnulacionAbierto, setModalAnulacionAbierto] = useState(false);
  const [anulando, setAnulando] = useState(false);

  useEffect(() => {
    setModalAnulacionAbierto(false);
    setAnulando(false);
    if (!idVenta) return undefined;

    let vigente = true;
    setEstado({ venta: null, cargando: true, error: null });
    obtenerVentaPorId(idVenta)
      .then((venta) => vigente && setEstado({ venta, cargando: false, error: null }))
      .catch((error) => vigente && setEstado({
        venta: null,
        cargando: false,
        error: error.message || 'No se pudo cargar el detalle de la venta.',
      }));
    return () => { vigente = false; };
  }, [idVenta, intento]);

  const { venta, cargando, error } = estado;
  const rolGlobal = usuario?.rol === 'dueno' || usuario?.rol === 'administrador';
  const esResponsable = usuario?.rol === 'dependiente'
    && Number(usuario?.id_usuario) === Number(venta?.id_usuario);
  const puedeSolicitarAnulacion = rolGlobal || esResponsable;

  const cerrarDetalle = () => {
    if (!anulando && !modalAnulacionAbierto) onClose();
  };

  const confirmarAnulacion = async (motivo) => {
    setAnulando(true);
    try {
      const ventaActualizada = await anularVenta(idVenta, motivo);
      setEstado({ venta: ventaActualizada, cargando: false, error: null });
      setModalAnulacionAbierto(false);
      toast.success('Venta anulada correctamente.');
      onVentaAnulada?.(ventaActualizada);
    } catch (errorSolicitud) {
      toast.error(errorSolicitud.message || 'No se pudo anular la venta.');
    } finally {
      setAnulando(false);
    }
  };

  return (
    <>
      <AccessibleDialog
        open={Boolean(idVenta)}
        labelledBy="titulo-detalle-venta"
        describedBy="descripcion-detalle-venta"
        onClose={cerrarDetalle}
        busy={anulando}
        size="large"
        className={styles.dialog}
      >
        <header className={styles.dialogHeader}>
          <div>
            <h2 id="titulo-detalle-venta">Detalle de venta #{idVenta}</h2>
            <p id="descripcion-detalle-venta">Consulta el cobro, los productos y el estado de esta venta.</p>
          </div>
          <button
            type="button"
            onClick={cerrarDetalle}
            disabled={anulando}
            aria-label="Cerrar detalle de venta"
            className={styles.dialogClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {cargando && (
          <ContentState
            compact
            variant="loading"
            title="Cargando detalle de venta…"
            ariaLabel="Cargando detalle de venta"
          />
        )}
        {!cargando && error && (
          <ContentState
            compact
            variant="error"
            title="No se pudo cargar el detalle"
            message={error}
            onRetry={() => setIntento((actual) => actual + 1)}
          />
        )}

        {!cargando && !error && venta && (
          <div className={styles.dialogBody}>
            <div className={styles.statusRow}>
              <span className={`${ui.badge} ${venta.estado === 'anulada' ? ui.badgeDanger : ui.badgeActive}`}>
                Estado: {capitalizar(venta.estado)}
              </span>
              <span className={styles.paymentLabel}>Pago en {capitalizar(venta.metodo_pago).toLocaleLowerCase('es')}</span>
            </div>

            <dl className={styles.detailGrid}>
              <div><dt>Sucursal</dt><dd>{venta.nombre_sucursal || 'No disponible'}</dd></div>
              <div><dt>Cliente</dt><dd>{venta.nombre_cliente || 'Consumidor final'}</dd></div>
              <div><dt>Atendió</dt><dd>{venta.nombre_usuario || 'No disponible'}</dd></div>
              <div><dt>Fecha</dt><dd>{formatearFecha(venta.fecha_venta)}</dd></div>
              <div><dt>Método de pago</dt><dd>{capitalizar(venta.metodo_pago)}</dd></div>
              <div><dt>Total cobrado</dt><dd className={styles.totalValue}>{formatearMoneda(venta.total)}</dd></div>
              {venta.metodo_pago === 'tarjeta' && venta.tarjeta_ultimos4 && (
                <div><dt>Tarjeta</dt><dd>Terminada en {venta.tarjeta_ultimos4}</dd></div>
              )}
            </dl>

            {venta.estado === 'anulada' && (
              <section aria-labelledby="titulo-datos-anulacion" className={styles.cancellationInfo}>
                <h3 id="titulo-datos-anulacion" className={styles.cancellationHeading}>
                  <Ban size={16} aria-hidden="true" /> Datos de anulación
                </h3>
                <dl className={styles.cancellationGrid}>
                  <div><dt>Anulada por</dt><dd>{venta.nombre_usuario_anulacion || 'No disponible'}</dd></div>
                  <div><dt>Fecha de anulación</dt><dd>{formatearFecha(venta.fecha_anulacion)}</dd></div>
                  <div><dt>Motivo</dt><dd>{venta.motivo_anulacion || 'No disponible'}</dd></div>
                </dl>
              </section>
            )}

            {venta.estado === 'completada' && venta.metodo_pago === 'tarjeta' && (
              <div className={styles.notice}>
                <CreditCard size={18} aria-hidden="true" />
                <p>Las ventas con tarjeta requieren un reembolso en Recurrente y no se anulan directamente desde FarmaCom.</p>
              </div>
            )}

            <section className={styles.productSection} aria-labelledby="titulo-productos-venta">
              <h3 id="titulo-productos-venta">Productos vendidos</h3>
              <table className={styles.detailTable}>
                <thead>
                  <tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Precio</th><th scope="col">Subtotal</th></tr>
                </thead>
                <tbody>
                  {(venta.detalles || []).map((detalle) => (
                    <tr key={detalle.id_detalle_venta}>
                      <td data-label="Producto">{detalle.nombre_comercial}</td>
                      <td data-label="Cantidad">{FORMATO_NUMERO.format(Number(detalle.cantidad || 0))}</td>
                      <td data-label="Precio">{formatearMoneda(detalle.precio_unitario)}</td>
                      <td data-label="Subtotal"><strong>{formatearMoneda(detalle.subtotal)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {venta.estado === 'completada' && puedeSolicitarAnulacion && (
              <div className={styles.dialogActions}>
                <button
                  type="button"
                  onClick={() => setModalAnulacionAbierto(true)}
                  className={`${ui.button} ${venta.metodo_pago === 'tarjeta' ? '' : ui.danger}`}
                >
                  {venta.metodo_pago === 'tarjeta' ? <CreditCard size={16} aria-hidden="true" /> : <Ban size={16} aria-hidden="true" />}
                  {venta.metodo_pago === 'tarjeta' ? 'Ver indicaciones de reembolso' : 'Anular venta'}
                </button>
              </div>
            )}

            {venta.estado === 'completada' && !puedeSolicitarAnulacion && (
              <p className={styles.permissionMessage}>
                <AlertCircle size={16} aria-hidden="true" />
                Solo el responsable de la venta o un usuario administrativo puede anularla.
              </p>
            )}
          </div>
        )}
      </AccessibleDialog>

      <VentaAnularModal
        isOpen={modalAnulacionAbierto}
        venta={venta}
        anulando={anulando}
        error={null}
        onClose={() => { if (!anulando) setModalAnulacionAbierto(false); }}
        onConfirm={confirmarAnulacion}
      />
    </>
  );
}
