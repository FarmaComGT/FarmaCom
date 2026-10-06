import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, History, RefreshCw, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useHistorialPreciosProducto from '../../../hooks/useHistorialPreciosProducto';

const COLORES_TIPO = { compra: '#0f766e', venta: '#d97706' };

const formatearFechaHora = (valor) => new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(valor));

const formatearMoneda = (valor) => `Q${Number(valor || 0).toFixed(2)}`;

const filtrarPorFechas = (historial, fechaDesde, fechaHasta) => {
  const desde = fechaDesde ? new Date(`${fechaDesde}T00:00:00`) : null;
  const hasta = fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`) : null;

  return historial.filter((cambio) => {
    const fecha = new Date(cambio.fecha_cambio);
    return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
  });
};

function TooltipPrecio({ active, payload }) {
  if (!active || !payload?.length) return null;
  const cambio = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <p className="font-bold text-primary">Lote {cambio.numero_lote}</p>
      <p className="mt-1 capitalize text-slate-500">
        {cambio.es_inicial ? 'Valor inicial' : 'Precio'} de {cambio.tipo_precio}
      </p>
      <p className="mt-1 font-extrabold text-slate-800">{formatearMoneda(cambio.valor_nuevo)}</p>
      <p className="mt-1 text-slate-400">
        {cambio.es_inicial ? 'Antes del ' : ''}{formatearFechaHora(cambio.fecha_cambio)}
      </p>
    </div>
  );
}

export default function HistorialPrecioProductoModal({ producto, isOpen, onClose }) {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tipoGrafica, setTipoGrafica] = useState('venta');
  const { historial, cargando, error, recargar } = useHistorialPreciosProducto(
    producto?.id_producto,
    { enabled: isOpen },
  );

  useEffect(() => {
    if (!isOpen) return;
    setFechaDesde('');
    setFechaHasta('');
    setTipoGrafica('venta');
  }, [isOpen, producto?.id_producto]);

  const rangoInvalido = Boolean(fechaDesde && fechaHasta && fechaDesde > fechaHasta);
  const historialFiltrado = useMemo(
    () => (rangoInvalido ? [] : filtrarPorFechas(historial, fechaDesde, fechaHasta)),
    [fechaDesde, fechaHasta, historial, rangoInvalido],
  );
  const datosGrafica = useMemo(() => {
    const cambios = historialFiltrado
      .filter((cambio) => cambio.tipo_precio === tipoGrafica)
      .reverse();

    if (cambios.length === 0) return [];

    const primerCambio = cambios[0];
    return [
      {
        ...primerCambio,
        id_grafica: `inicial-${primerCambio.id_historial_precio}`,
        etiqueta: 'Inicial',
        valor_nuevo: Number(primerCambio.valor_anterior),
        es_inicial: true,
      },
      ...cambios.map((cambio, indice) => ({
        ...cambio,
        id_grafica: `cambio-${cambio.id_historial_precio}`,
        etiqueta: String(indice + 1),
        valor_nuevo: Number(cambio.valor_nuevo),
        es_inicial: false,
      })),
    ];
  }, [historialFiltrado, tipoGrafica]);

  if (!isOpen || !producto || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-historial-precios"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2 text-primary">
              <History className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="titulo-historial-precios" className="truncate font-headline text-xl font-extrabold text-primary">
                Historial de precios
              </h2>
              <p className="truncate text-sm text-slate-500">
                {producto.nombre_comercial} · {producto.codigo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar historial de precios"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-6 overflow-y-auto p-6">
          <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-end">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              Filtrar por fecha
            </div>
            <label className="text-xs font-bold text-slate-500">
              Desde
              <input
                type="date"
                value={fechaDesde}
                onChange={(event) => setFechaDesde(event.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Hasta
              <input
                type="date"
                value={fechaHasta}
                onChange={(event) => setFechaHasta(event.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            {(fechaDesde || fechaHasta) && (
              <button
                type="button"
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                className="rounded-xl px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5"
              >
                Limpiar filtros
              </button>
            )}
            <button
              type="button"
              onClick={recargar}
              disabled={cargando}
              className="sm:ml-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:text-primary disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
              Actualizar
            </button>
          </div>

          {rangoInvalido && (
            <p role="alert" className="rounded-xl bg-error-container/30 px-4 py-3 text-sm font-semibold text-on-error-container">
              La fecha inicial no puede ser posterior a la fecha final.
            </p>
          )}

          {cargando && (
            <div aria-label="Cargando historial de precios" className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          )}

          {!cargando && error && (
            <p role="alert" className="rounded-xl bg-error-container/30 px-4 py-3 text-sm font-semibold text-on-error-container">
              {error}
            </p>
          )}

          {!cargando && !error && !rangoInvalido && historialFiltrado.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center text-sm font-medium text-slate-500">
              No hay cambios de precio en el período seleccionado.
            </div>
          )}

          {!cargando && !error && historialFiltrado.length > 0 && (
            <>
              <section aria-labelledby="titulo-grafica-precios" className="rounded-2xl border border-slate-100 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 id="titulo-grafica-precios" className="font-headline text-base font-extrabold text-slate-800">
                    Evolución del precio de {tipoGrafica}
                  </h3>
                  <div
                    role="group"
                    aria-label="Tipo de precio en la gráfica"
                    className="inline-flex w-fit rounded-xl bg-slate-100 p-1"
                  >
                    <button
                      type="button"
                      aria-pressed={tipoGrafica === 'compra'}
                      onClick={() => setTipoGrafica('compra')}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        tipoGrafica === 'compra'
                          ? 'bg-teal-700 text-white shadow-sm'
                          : 'text-slate-500 hover:text-teal-700'
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" aria-hidden="true" />
                      Compra
                    </button>
                    <button
                      type="button"
                      aria-pressed={tipoGrafica === 'venta'}
                      onClick={() => setTipoGrafica('venta')}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        tipoGrafica === 'venta'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-amber-700'
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden="true" />
                      Venta
                    </button>
                  </div>
                </div>
                {datosGrafica.length > 0 ? (
                  <div className="mt-4 h-72 min-w-[520px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosGrafica} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} />
                        <YAxis
                          tickFormatter={(valor) => `Q${valor}`}
                          axisLine={false}
                          tickLine={false}
                          width={62}
                        />
                        <Tooltip content={<TooltipPrecio />} cursor={{ fill: '#005147', opacity: 0.05 }} />
                        <Bar dataKey="valor_nuevo" name="Precio nuevo" radius={[6, 6, 0, 0]} maxBarSize={38}>
                          {datosGrafica.map((cambio) => (
                            <Cell
                              key={cambio.id_grafica}
                              fill={COLORES_TIPO[cambio.tipo_precio] || '#64748b'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-4 flex h-72 items-center justify-center rounded-xl bg-slate-50 text-sm font-medium text-slate-500">
                    No hay cambios de precio de {tipoGrafica} en el período seleccionado.
                  </div>
                )}
              </section>

              <section aria-labelledby="titulo-tabla-precios" className="overflow-hidden rounded-2xl border border-slate-200">
                <h3 id="titulo-tabla-precios" className="border-b border-slate-100 px-5 py-4 font-headline text-base font-extrabold text-slate-800">
                  Detalle de cambios
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-[860px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Fecha</th>
                        <th className="px-5 py-3">Lote</th>
                        <th className="px-5 py-3">Tipo</th>
                        <th className="px-5 py-3 text-right">Anterior</th>
                        <th className="px-5 py-3 text-right">Nuevo</th>
                        <th className="px-5 py-3">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historialFiltrado.map((cambio) => (
                        <tr key={cambio.id_historial_precio}>
                          <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatearFechaHora(cambio.fecha_cambio)}</td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-600">{cambio.numero_lote}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">
                              {cambio.tipo_precio}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-500">{formatearMoneda(cambio.valor_anterior)}</td>
                          <td className="px-5 py-3 text-right font-bold text-primary">{formatearMoneda(cambio.valor_nuevo)}</td>
                          <td className="px-5 py-3 text-slate-700">{cambio.nombre_usuario}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
