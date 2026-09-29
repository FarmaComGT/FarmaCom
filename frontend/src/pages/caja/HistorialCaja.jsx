import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, History, Search } from 'lucide-react';
import { obtenerCajas } from '../../api/cajas';
import useHistorialCaja from '../../hooks/useHistorialCaja';
import useSucursales from '../../hooks/useSucursales';
import { useAuth } from '../../context/AuthContext';
import CajaSubNav from '../../components/caja/CajaSubNav';

const FILTROS_INICIALES = {
  id_sucursal: '',
  id_caja: '',
  fecha_desde: '',
  fecha_hasta: '',
};

const formatearMoneda = (valor) => new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
}).format(Number(valor || 0));

const formatearFecha = (valor) => {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor));
};

export default function HistorialCaja() {
  const { usuario } = useAuth();
  const [borrador, setBorrador] = useState(FILTROS_INICIALES);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [cajas, setCajas] = useState([]);
  const [cargandoCajas, setCargandoCajas] = useState(false);
  const [errorCajas, setErrorCajas] = useState(null);
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales } = useSucursales();
  const { cierres, cargando, error } = useHistorialCaja(filtros);

  useEffect(() => {
    if (!borrador.id_sucursal) {
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
          { id_sucursal: borrador.id_sucursal },
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
  }, [borrador.id_sucursal]);

  const cambiarFiltro = (evento) => {
    const { name, value } = evento.target;
    setBorrador((actual) => ({
      ...actual,
      [name]: value,
      ...(name === 'id_sucursal' ? { id_caja: '' } : {}),
    }));
  };

  const aplicarFiltros = (evento) => {
    evento.preventDefault();
    setFiltros(borrador);
  };

  const limpiarFiltros = () => {
    setBorrador(FILTROS_INICIALES);
    setFiltros(FILTROS_INICIALES);
  };

  return (
    <div className="space-y-6">
      <CajaSubNav rol={usuario?.rol} />

      <header className="rounded-2xl border border-slate-200 bg-surface-container-low/70 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-headline text-xl font-extrabold text-primary">
              Historial de cierres
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Consulta los arqueos realizados por fecha, sucursal y caja.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-headline text-lg font-bold text-primary">Filtros</h2>
        </div>
        <form onSubmit={aplicarFiltros} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="filtro-sucursal" className="text-sm font-semibold text-slate-700">
              Sucursal
            </label>
            <div className="relative mt-1">
              <select
                id="filtro-sucursal"
                name="id_sucursal"
                value={borrador.id_sucursal}
                onChange={cambiarFiltro}
                disabled={cargandoSucursales}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-11 text-sm outline-none hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
              >
                <option value="">Todas las sucursales</option>
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
            <label htmlFor="filtro-caja" className="text-sm font-semibold text-slate-700">
              Caja
            </label>
            <div className="relative mt-1">
              <select
                id="filtro-caja"
                name="id_caja"
                value={borrador.id_caja}
                onChange={cambiarFiltro}
                disabled={!borrador.id_sucursal || cargandoCajas}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-11 text-sm outline-none hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {cargandoCajas ? 'Cargando cajas...' : 'Todas las cajas'}
                </option>
                {cajas.map((caja) => (
                  <option key={caja.id_caja} value={caja.id_caja}>{caja.nombre}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </div>
          </div>

          <div>
            <label htmlFor="fecha-desde" className="text-sm font-semibold text-slate-700">
              Desde
            </label>
            <input
              id="fecha-desde"
              name="fecha_desde"
              type="date"
              value={borrador.fecha_desde}
              onChange={cambiarFiltro}
              max={borrador.fecha_hasta || undefined}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label htmlFor="fecha-hasta" className="text-sm font-semibold text-slate-700">
              Hasta
            </label>
            <input
              id="fecha-hasta"
              name="fecha_hasta"
              type="date"
              value={borrador.fecha_hasta}
              onChange={cambiarFiltro}
              min={borrador.fecha_desde || undefined}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row xl:col-span-4 xl:justify-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Aplicar filtros
            </button>
          </div>
        </form>
      </section>

      {(error || errorCajas || errorSucursales) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error || errorCajas || errorSucursales}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-headline text-lg font-bold text-primary">Cierres registrados</h2>
          {!cargando && <p className="mt-1 text-sm text-slate-500">{cierres.length} resultados</p>}
        </div>

        {cargando ? (
          <div role="status" className="px-5 py-12 text-center text-sm font-medium text-slate-500">
            Cargando historial...
          </div>
        ) : cierres.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No hay cierres que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Fecha</th>
                  <th className="px-4 py-3 font-bold">Sucursal / caja</th>
                  <th className="px-4 py-3 font-bold">Turno</th>
                  <th className="px-4 py-3 text-right font-bold">Ventas</th>
                  <th className="px-4 py-3 text-right font-bold">Esperado</th>
                  <th className="px-4 py-3 text-right font-bold">Contado</th>
                  <th className="px-4 py-3 text-right font-bold">Diferencia</th>
                  <th className="px-4 py-3 font-bold">Cerró</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cierres.map((cierre) => (
                  <tr key={cierre.id_sesion_caja} className="hover:bg-primary/[0.025]">
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatearFecha(cierre.fecha_hora_cierre)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-700">{cierre.nombre_sucursal}</p>
                      <p className="text-xs text-slate-500">{cierre.nombre_caja}</p>
                    </td>
                    <td className="px-4 py-4 capitalize text-slate-600">{cierre.turno}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-700">
                      {formatearMoneda(cierre.total_ventas)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-slate-600">
                      {formatearMoneda(cierre.efectivo_esperado)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-slate-600">
                      {formatearMoneda(cierre.efectivo_contado)}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-right font-bold ${
                      Number(cierre.diferencia_efectivo) === 0
                        ? 'text-slate-500'
                        : Number(cierre.diferencia_efectivo) > 0
                          ? 'text-primary'
                          : 'text-red-600'
                    }`}>
                      {formatearMoneda(cierre.diferencia_efectivo)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{cierre.usuario_cierre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
