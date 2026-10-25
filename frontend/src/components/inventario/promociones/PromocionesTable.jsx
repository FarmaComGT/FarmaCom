import React from 'react';
import { CalendarDays, Pencil, Power } from 'lucide-react';
import { formatearQuetzales } from '../../../utils/pos';

const formatearFecha = (valor) => {
  if (!valor) return '—';
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

const estadoVigencia = (promocion) => {
  if (!promocion.activo) return { texto: 'Inactiva', clase: 'bg-slate-100 text-slate-600' };
  const ahora = new Date();
  const hoy = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0'),
  ].join('-');
  const inicio = String(promocion.fecha_inicio).slice(0, 10);
  const fin = String(promocion.fecha_fin).slice(0, 10);
  if (hoy < inicio) return { texto: 'Programada', clase: 'bg-sky-100 text-sky-700' };
  if (hoy > fin) return { texto: 'Finalizada', clase: 'bg-amber-100 text-amber-700' };
  return { texto: 'Vigente', clase: 'bg-emerald-100 text-emerald-700' };
};

export default function PromocionesTable({
  promociones,
  cargando,
  cambiandoId,
  onEditar,
  onCambiarEstado,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-surface-container-low/60">
      <div className="overflow-x-auto">
        <div className="min-w-[850px]">
          <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_1.2fr_0.7fr] gap-4 border-b border-slate-200 bg-white/70 px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            <span>Sucursal</span>
            <span>Condición</span>
            <span>Precio</span>
            <span>Vigencia</span>
            <span className="text-right">Acciones</span>
          </div>

          {cargando && <p className="px-5 py-12 text-center font-medium text-slate-500">Cargando promociones...</p>}
          {!cargando && promociones.length === 0 && (
            <p className="px-5 py-12 text-center font-medium text-slate-500">
              Este producto todavía no tiene promociones.
            </p>
          )}
          {!cargando && promociones.map((promocion) => {
            const estado = estadoVigencia(promocion);
            const procesando = Number(cambiandoId) === Number(promocion.id_promocion);
            return (
              <div
                key={promocion.id_promocion}
                className="grid grid-cols-[1.1fr_0.8fr_0.8fr_1.2fr_0.7fr] items-center gap-4 border-b border-slate-200 px-5 py-4 last:border-0"
              >
                <div>
                  <p className="font-headline text-sm font-extrabold text-on-surface">
                    {promocion.nombre_sucursal}
                  </p>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${estado.clase}`}>
                    {estado.texto}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  Desde {promocion.cantidad_minima} unidades
                </p>
                <p className="font-mono text-sm font-extrabold text-primary">
                  {formatearQuetzales(promocion.precio_promocion)}
                </p>
                <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {formatearFecha(promocion.fecha_inicio)} – {formatearFecha(promocion.fecha_fin)}
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEditar(promocion)}
                    aria-label={`Editar promoción ${promocion.id_promocion}`}
                    className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onCambiarEstado(promocion)}
                    disabled={procesando}
                    aria-label={`${promocion.activo ? 'Desactivar' : 'Activar'} promoción ${promocion.id_promocion}`}
                    className={`rounded-lg p-2 disabled:opacity-50 ${
                      promocion.activo
                        ? 'text-error hover:bg-error-container/40'
                        : 'text-primary hover:bg-primary/10'
                    }`}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
