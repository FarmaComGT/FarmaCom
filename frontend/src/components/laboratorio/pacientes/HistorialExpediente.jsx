import React from 'react';
import { History, RefreshCw } from 'lucide-react';
import useHistorialExpediente from '../../../hooks/useHistorialExpediente';

const ETIQUETAS_ENTIDAD = {
  paciente: 'Paciente',
  expediente_laboratorio: 'Expediente',
  resultado_laboratorio: 'Resultado',
  visita_laboratorio: 'Visita',
};

const ETIQUETAS_CAMPO = {
  telefono: 'Teléfono',
  direccion: 'Dirección',
  fecha_nacimiento: 'Fecha de nacimiento',
  edad_manual: 'Edad',
  nombre_paciente: 'Nombre del paciente',
  motivo_anulacion: 'Motivo de anulación',
  fecha_anulacion: 'Fecha de anulación',
};

const formatearFechaHora = (valor) => new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(valor));

const formatearCampo = (campo) => ETIQUETAS_CAMPO[campo] || campo
  .replace(/^id_/, '')
  .replaceAll('_', ' ')
  .replace(/^./, (letra) => letra.toUpperCase());

const formatearValor = (valor) => {
  if (valor === null || valor === undefined || valor === '') return 'Sin valor';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};

const obtenerCambios = (entrada) => {
  const anteriores = entrada.valores_anteriores || {};
  const nuevos = entrada.valores_nuevos || {};
  return [...new Set([...Object.keys(anteriores), ...Object.keys(nuevos)])]
    .map((campo) => ({
      campo,
      anterior: anteriores[campo],
      nuevo: nuevos[campo],
    }));
};

export default function HistorialExpediente({ idExpediente }) {
  const { historial, cargando, error, recargar } = useHistorialExpediente(idExpediente);

  return (
    <section
      aria-labelledby="titulo-historial-expediente"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <History className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="titulo-historial-expediente" className="font-headline text-lg font-extrabold text-primary">
              Historial del expediente
            </h2>
            <p className="text-xs text-slate-500">Quién, cuándo y qué cambió</p>
          </div>
        </div>
        <button
          type="button"
          onClick={recargar}
          disabled={cargando}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-primary/20 hover:text-primary disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {cargando && (
        <div aria-label="Cargando historial del expediente" className="m-5 h-28 animate-pulse rounded-xl bg-slate-100" />
      )}

      {!cargando && error && (
        <div role="alert" className="m-5 rounded-xl bg-error-container/30 px-4 py-3 text-sm font-semibold text-on-error-container">
          {error}
        </div>
      )}

      {!cargando && !error && historial.length === 0 && (
        <p className="px-5 py-10 text-center text-sm font-medium text-slate-500">
          Todavía no hay cambios registrados en este expediente.
        </p>
      )}

      {!cargando && !error && historial.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Usuario</th>
                <th className="w-32 px-5 py-3 text-center">Acción</th>
                <th className="px-5 py-3">Cambios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.map((entrada) => (
                <tr key={entrada.id_bitacora} className="align-top">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {formatearFechaHora(entrada.fecha_hora)}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{entrada.nombre_usuario}</p>
                    <p className="text-xs text-slate-400">Usuario #{entrada.id_usuario}</p>
                  </td>
                  <td className="w-32 px-5 py-4 text-center">
                    <span className="inline-flex min-w-20 justify-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold capitalize text-primary">
                      {entrada.accion}
                    </span>
                    <p className="mt-1 text-center text-xs text-slate-500">
                      {ETIQUETAS_ENTIDAD[entrada.entidad] || entrada.entidad}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <ul className="space-y-1.5">
                      {obtenerCambios(entrada).map((cambio) => (
                        <li key={cambio.campo} className="text-xs text-slate-600">
                          <span className="font-bold text-slate-700">{formatearCampo(cambio.campo)}:</span>{' '}
                          <span className="text-slate-400">{formatearValor(cambio.anterior)}</span>
                          <span aria-hidden="true"> → </span>
                          <span className="font-semibold text-slate-700">{formatearValor(cambio.nuevo)}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
