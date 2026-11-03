import React from 'react';
import { History, RefreshCw } from 'lucide-react';
import useHistorialExpediente from '../../../hooks/useHistorialExpediente';
import ContentState from '../../ui/ContentState.jsx';
import management from '../../../styles/ManagementUI.module.css';
import laboratory from '../../../styles/LaboratoryUI.module.css';

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

const formatearValor = (campo, valor) => {
  if (valor === null || valor === undefined || valor === '') return 'Sin valor';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'object') return JSON.stringify(valor);
  if (campo.startsWith('fecha_')) {
    const fecha = new Date(valor);
    if (!Number.isNaN(fecha.getTime())) {
      return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'UTC' }).format(fecha);
    }
  }
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
      className={laboratory.history}
    >
      <div className={laboratory.historyHeader}>
        <div className={laboratory.historyTitle}>
          <span className={laboratory.storageIcon}>
            <History className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="titulo-historial-expediente">
              Historial del expediente
            </h2>
            <p className="text-xs text-slate-500">Quién, cuándo y qué cambió</p>
          </div>
        </div>
        <button
          type="button"
          onClick={recargar}
          disabled={cargando}
          className={management.button}
        >
          <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {cargando && (
        <ContentState variant="loading" message="Cargando historial…" compact />
      )}

      {!cargando && error && (
        <ContentState variant="error" message={error} onRetry={recargar} compact />
      )}

      {!cargando && !error && historial.length === 0 && (
        <ContentState message="Todavía no hay cambios registrados en este expediente." compact />
      )}

      {!cargando && !error && historial.length > 0 && (
        <div className={laboratory.historyTableWrap}>
          <table className={laboratory.historyTable}>
            <colgroup>
              <col className={laboratory.historyDateColumn} />
              <col className={laboratory.historyUserColumn} />
              <col className={laboratory.historyActionColumn} />
              <col className={laboratory.historyChangesColumn} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Usuario</th>
                <th scope="col">Acción</th>
                <th scope="col">Cambios</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((entrada) => (
                <tr key={entrada.id_bitacora}>
                  <td data-label="Fecha" className={laboratory.historyDate}>
                    <time dateTime={entrada.fecha_hora}>{formatearFechaHora(entrada.fecha_hora)}</time>
                  </td>
                  <td data-label="Usuario" className={laboratory.historyUser}>
                    <strong>{entrada.nombre_usuario}</strong>
                    <span>Usuario #{entrada.id_usuario}</span>
                  </td>
                  <td data-label="Acción" className={laboratory.historyAction}>
                    <div className={laboratory.historyActionContent}>
                      <span className={laboratory.historyActionBadge}>
                        {entrada.accion}
                      </span>
                      <span className={laboratory.historyEntity}>
                        {ETIQUETAS_ENTIDAD[entrada.entidad] || entrada.entidad}
                      </span>
                    </div>
                  </td>
                  <td data-label="Cambios" className={laboratory.historyChanges}>
                    <ul>
                      {obtenerCambios(entrada).map((cambio) => (
                        <li key={cambio.campo}>
                          <strong>{formatearCampo(cambio.campo)}:</strong>
                          <span className={laboratory.historyPrevious}>{formatearValor(cambio.campo, cambio.anterior)}</span>
                          <span className={laboratory.historyArrow} aria-hidden="true">→</span>
                          <span className={laboratory.historyNext}>{formatearValor(cambio.campo, cambio.nuevo)}</span>
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
