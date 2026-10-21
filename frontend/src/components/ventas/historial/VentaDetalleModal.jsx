import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ban,
  CalendarClock,
  CreditCard,
  UserRound,
  X,
} from 'lucide-react';
import { anularVenta, obtenerVentaPorId } from '../../../api/ventas';
import { useAuth } from '../../../context/AuthContext';
import { formatearMoneda } from '../../../utils/reportes';
import VentaAnularModal from './VentaAnularModal';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Guatemala',
});

const formatearFecha = (valor) => {
  if (!valor) return 'No disponible';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? 'No disponible' : FORMATO_FECHA.format(fecha);
};

export default function VentaDetalleModal({ idVenta, onClose, onVentaAnulada }) {
  const { usuario } = useAuth();
  const [estado, setEstado] = useState({ venta: null, cargando: false, error: null });
  const [modalAnulacionAbierto, setModalAnulacionAbierto] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState(null);

  useEffect(() => {
    setModalAnulacionAbierto(false);
    setErrorAnulacion(null);
    setAnulando(false);
    if (!idVenta) return undefined;

    let vigente = true;
    setEstado({ venta: null, cargando: true, error: null });
    obtenerVentaPorId(idVenta)
      .then((venta) => vigente && setEstado({ venta, cargando: false, error: null }))
      .catch((error) => vigente && setEstado({
        venta: null,
        cargando: false,
        error: error.message,
      }));
    return () => { vigente = false; };
  }, [idVenta]);

  if (!idVenta) return null;
  const { venta, cargando, error } = estado;
  const rolGlobal = usuario?.rol === 'dueno' || usuario?.rol === 'administrador';
  const esResponsable = usuario?.rol === 'dependiente'
    && Number(usuario?.id_usuario) === Number(venta?.id_usuario);
  const puedeSolicitarAnulacion = rolGlobal || esResponsable;

  const abrirAnulacion = () => {
    setErrorAnulacion(null);
    setModalAnulacionAbierto(true);
  };

  const cerrarAnulacion = () => {
    if (anulando) return;
    setModalAnulacionAbierto(false);
    setErrorAnulacion(null);
  };

  const confirmarAnulacion = async (motivo) => {
    setAnulando(true);
    setErrorAnulacion(null);
    try {
      const ventaActualizada = await anularVenta(idVenta, motivo);
      setEstado({ venta: ventaActualizada, cargando: false, error: null });
      setModalAnulacionAbierto(false);
      onVentaAnulada?.(ventaActualizada);
    } catch (errorSolicitud) {
      setErrorAnulacion(errorSolicitud.message || 'No se pudo anular la venta.');
    } finally {
      setAnulando(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        role="presentation"
        onMouseDown={(evento) => evento.target === evento.currentTarget && onClose()}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-detalle-venta"
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        >
          <header className="flex items-center justify-between gap-3">
            <h2 id="titulo-detalle-venta" className="font-headline text-xl font-extrabold text-primary">
              Detalle de venta #{idVenta}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle de venta"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {cargando && (
            <div
              role="status"
              className="mt-5 h-32 animate-pulse rounded-xl bg-slate-100"
              aria-label="Cargando detalle de venta"
            />
          )}
          {error && <p role="alert" className="mt-5 text-sm font-semibold text-error">{error}</p>}

          {venta && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
                  venta.estado === 'anulada'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
                >
                  {venta.estado}
                </span>
                <span className="text-sm font-semibold capitalize text-slate-500">
                  Pago en {venta.metodo_pago}
                </span>
              </div>

              <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <p><span className="font-bold">Sucursal:</span> {venta.nombre_sucursal}</p>
                <p><span className="font-bold">Cliente:</span> {venta.nombre_cliente || 'Consumidor final'}</p>
                <p><span className="font-bold">Atendió:</span> {venta.nombre_usuario}</p>
                <p><span className="font-bold">Fecha:</span> {formatearFecha(venta.fecha_venta)}</p>
                <p><span className="font-bold">Total:</span> {formatearMoneda(venta.total)}</p>
                {venta.metodo_pago === 'tarjeta' && venta.tarjeta_ultimos4 && (
                  <p><span className="font-bold">Tarjeta:</span> terminada en {venta.tarjeta_ultimos4}</p>
                )}
              </div>

              {venta.estado === 'anulada' && (
                <section
                  aria-label="Datos de anulación"
                  className="rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <div className="flex items-center gap-2 text-red-800">
                    <Ban className="h-4 w-4" />
                    <h3 className="text-sm font-extrabold">Datos de anulación</h3>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="flex items-center gap-1.5 font-bold text-red-800">
                        <UserRound className="h-3.5 w-3.5" /> Anulada por
                      </dt>
                      <dd className="mt-1 text-red-700">
                        {venta.nombre_usuario_anulacion || 'No disponible'}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 font-bold text-red-800">
                        <CalendarClock className="h-3.5 w-3.5" /> Fecha de anulación
                      </dt>
                      <dd className="mt-1 text-red-700">{formatearFecha(venta.fecha_anulacion)}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-bold text-red-800">Motivo</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-red-700">{venta.motivo_anulacion}</dd>
                    </div>
                  </dl>
                </section>
              )}

              {venta.estado === 'completada' && venta.metodo_pago === 'tarjeta' && (
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <p>
                    Las ventas con tarjeta requieren un reembolso en Recurrente y no se anulan
                    directamente desde FarmaCom.
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2">Producto</th>
                      <th className="py-2 text-right">Cantidad</th>
                      <th className="py-2 text-right">Precio</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {venta.detalles.map((detalle) => (
                      <tr key={detalle.id_detalle_venta}>
                        <td className="py-3">{detalle.nombre_comercial}</td>
                        <td className="py-3 text-right">{detalle.cantidad}</td>
                        <td className="py-3 text-right">{formatearMoneda(detalle.precio_unitario)}</td>
                        <td className="py-3 text-right font-bold">{formatearMoneda(detalle.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {venta.estado === 'completada' && puedeSolicitarAnulacion && (
                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={abrirAnulacion}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${
                      venta.metodo_pago === 'tarjeta'
                        ? 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {venta.metodo_pago === 'tarjeta' ? (
                      <><CreditCard className="h-4 w-4" /> Ver indicaciones de reembolso</>
                    ) : (
                      <><Ban className="h-4 w-4" /> Anular venta</>
                    )}
                  </button>
                </div>
              )}

              {venta.estado === 'completada' && !puedeSolicitarAnulacion && (
                <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Solo el responsable de la venta o un usuario administrativo puede anularla.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      <VentaAnularModal
        isOpen={modalAnulacionAbierto}
        venta={venta}
        anulando={anulando}
        error={errorAnulacion}
        onClose={cerrarAnulacion}
        onConfirm={confirmarAnulacion}
      />
    </>
  );
}
