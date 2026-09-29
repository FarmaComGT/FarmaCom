import React, { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  CreditCard,
  ChevronDown,
  WalletCards,
} from 'lucide-react';
import { obtenerCajas } from '../../api/cajas';
import useResumenCaja from '../../hooks/useResumenCaja';
import useSucursales from '../../hooks/useSucursales';

const obtenerFechaLocal = () => {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const formatearMoneda = (valor) => new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
}).format(Number(valor || 0));

export default function ResumenDiarioCaja({ idSucursalInicial = '' }) {
  const [fecha, setFecha] = useState(obtenerFechaLocal);
  const [idSucursal, setIdSucursal] = useState(
    () => (idSucursalInicial ? String(idSucursalInicial) : ''),
  );
  const [idCaja, setIdCaja] = useState('');
  const [cajas, setCajas] = useState([]);
  const [cargandoCajas, setCargandoCajas] = useState(false);
  const [errorCajas, setErrorCajas] = useState(null);
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales } = useSucursales();
  const { resumen, cargando, error } = useResumenCaja(fecha, idSucursal, idCaja);

  useEffect(() => {
    if (!idSucursal) {
      setCajas([]);
      setErrorCajas(null);
      return undefined;
    }

    const controller = new AbortController();
    const cargarCajas = async () => {
      setCargandoCajas(true);
      setErrorCajas(null);
      try {
        const resultado = await obtenerCajas(
          { id_sucursal: idSucursal, activa: true },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setCajas(resultado);
      } catch (errorSolicitud) {
        if (!controller.signal.aborted) {
          setCajas([]);
          setErrorCajas(
            errorSolicitud?.response?.data?.mensaje || 'No se pudieron cargar las cajas.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setCargandoCajas(false);
      }
    };

    cargarCajas();
    return () => controller.abort();
  }, [idSucursal]);

  const cambiarSucursal = (evento) => {
    setIdSucursal(evento.target.value);
    setIdCaja('');
  };
  const totales = resumen.reduce((acumulado, fila) => ({
    ventasEfectivo: acumulado.ventasEfectivo + Number(fila.ventas_efectivo || 0),
    ventasTarjeta: acumulado.ventasTarjeta + Number(fila.ventas_tarjeta || 0),
    entradas: acumulado.entradas + Number(fila.entradas || 0),
    salidas: acumulado.salidas + Number(fila.salidas || 0),
    diferencia: acumulado.diferencia + Number(fila.diferencia_efectivo || 0),
    sesionesCerradas: acumulado.sesionesCerradas + Number(fila.sesiones_cerradas || 0),
    sesionesAbiertas: acumulado.sesionesAbiertas + Number(fila.sesiones_abiertas || 0),
  }), {
    ventasEfectivo: 0,
    ventasTarjeta: 0,
    entradas: 0,
    salidas: 0,
    diferencia: 0,
    sesionesCerradas: 0,
    sesionesAbiertas: 0,
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div>
        <div>
          <h2 className="font-headline text-lg font-bold text-primary">Resumen diario</h2>
          <p className="mt-1 text-sm text-slate-500">
            Totales consolidados por método de pago y movimientos de efectivo.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(12rem,0.7fr)]">
          <div>
            <label htmlFor="sucursal-resumen" className="block text-sm font-semibold text-slate-700">
              Sucursal
            </label>
            <div className="relative mt-2">
              <select
                id="sucursal-resumen"
                value={idSucursal}
                onChange={cambiarSucursal}
                disabled={cargandoSucursales}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-11 text-sm outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
              >
                <option value="">Selecciona una sucursal</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                    {sucursal.nombre_sucursal}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </div>
          </div>

          <div>
            <label htmlFor="caja-resumen" className="block text-sm font-semibold text-slate-700">
              Caja
            </label>
            <div className="relative mt-2">
              <select
                id="caja-resumen"
                value={idCaja}
                onChange={(evento) => setIdCaja(evento.target.value)}
                disabled={!idSucursal || cargandoCajas}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-11 text-sm outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">{cargandoCajas ? 'Cargando cajas...' : 'Todas las cajas'}</option>
                {cajas.map((caja) => (
                  <option key={caja.id_caja} value={caja.id_caja}>{caja.nombre}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </div>
          </div>

          <div>
          <label htmlFor="fecha-resumen" className="block text-sm font-semibold text-slate-700">
            Día que deseas consultar
          </label>
          <input
            id="fecha-resumen"
            type="date"
            value={fecha}
            onChange={(evento) => setFecha(evento.target.value)}
            className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          </div>
        </div>
      </div>

      {(error || errorCajas || errorSucursales) && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error || errorCajas || errorSucursales}
        </div>
      )}

      {!idSucursal ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Selecciona una sucursal para consultar el resumen diario.
        </div>
      ) : cargando ? (
        <div role="status" className="py-10 text-center text-sm font-medium text-slate-500">
          Cargando resumen diario...
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { etiqueta: 'Ventas en efectivo', valor: totales.ventasEfectivo, Icono: Banknote },
              { etiqueta: 'Ventas con tarjeta', valor: totales.ventasTarjeta, Icono: CreditCard },
              { etiqueta: 'Entradas de efectivo', valor: totales.entradas, Icono: ArrowDownToLine },
              { etiqueta: 'Salidas de efectivo', valor: totales.salidas, Icono: ArrowUpFromLine },
            ].map(({ etiqueta, valor, Icono }) => (
              <article key={etiqueta} className="rounded-xl border border-slate-200 bg-surface-container-low/50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Icono className="h-4 w-4" aria-hidden="true" />
                  <p className="text-xs font-bold uppercase tracking-wide">{etiqueta}</p>
                </div>
                <p className="mt-2 font-headline text-xl font-extrabold text-primary">
                  {formatearMoneda(valor)}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Diferencia acumulada</p>
              <p className="mt-1 font-headline text-lg font-bold text-primary">
                {formatearMoneda(totales.diferencia)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sesiones cerradas</p>
              <p className="mt-1 font-headline text-lg font-bold text-primary">
                {totales.sesionesCerradas}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sesiones abiertas</p>
              </div>
              <p className="mt-1 font-headline text-lg font-bold text-primary">
                {totales.sesionesAbiertas}
              </p>
            </div>
          </div>

          {resumen.length === 0 && (
            <p className="mt-5 text-center text-sm text-slate-500">
              No hay actividad de caja para la fecha seleccionada.
            </p>
          )}
        </>
      )}
    </section>
  );
}
