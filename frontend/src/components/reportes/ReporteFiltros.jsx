import React, { useRef } from 'react';
import { CalendarDays, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { abrirSelectorFecha } from '../../utils/datePicker';
import styles from '../../styles/ReportsUI.module.css';

export default function ReporteFiltros({
  filtros,
  mostrarAgrupacion = true,
  sucursales,
  cargandoSucursales,
  errorSucursales,
  errorFiltros,
  onFiltroChange,
  onAplicar,
  onRestablecer,
}) {
  const campoDesdeRef = useRef(null);
  const campoHastaRef = useRef(null);

  const manejarEnvio = (evento) => {
    evento.preventDefault();
    onAplicar();
  };

  return (
    <form
      aria-label="Filtros de reportes"
      onSubmit={manejarEnvio}
      className={styles.filters}
    >
      <div className={`${styles.filterGrid} ${mostrarAgrupacion ? '' : styles.filterGridCompact}`}>
        <label className={styles.field}>
          <span>Sucursal</span>
          <div className={styles.controlWrap}>
            <select
              value={filtros.id_sucursal}
              onChange={(evento) => onFiltroChange('id_sucursal', evento.target.value)}
              disabled={cargandoSucursales}
              className={`${styles.control} ${styles.selectControl}`}
            >
              <option value="">
                {cargandoSucursales ? 'Cargando sucursales…' : 'Todas las sucursales'}
              </option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                  {sucursal.nombre_sucursal}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className={styles.controlIcon}
            />
          </div>
        </label>

        <label className={styles.field}>
          <span>Desde</span>
          <div className={styles.controlWrap}>
            <input
              ref={campoDesdeRef}
              type="date"
              value={filtros.fecha_desde}
              onChange={(evento) => onFiltroChange('fecha_desde', evento.target.value)}
              onClick={(evento) => {
                evento.preventDefault();
                abrirSelectorFecha(campoDesdeRef);
              }}
              className={`${styles.control} ${styles.dateControl}`}
            />
            <button
              type="button"
              onClick={() => abrirSelectorFecha(campoDesdeRef)}
              aria-label="Abrir calendario de fecha inicial"
              className={styles.dateButton}
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </label>

        <label className={styles.field}>
          <span>Hasta</span>
          <div className={styles.controlWrap}>
            <input
              ref={campoHastaRef}
              type="date"
              value={filtros.fecha_hasta}
              onChange={(evento) => onFiltroChange('fecha_hasta', evento.target.value)}
              onClick={(evento) => {
                evento.preventDefault();
                abrirSelectorFecha(campoHastaRef);
              }}
              className={`${styles.control} ${styles.dateControl}`}
            />
            <button
              type="button"
              onClick={() => abrirSelectorFecha(campoHastaRef)}
              aria-label="Abrir calendario de fecha final"
              className={styles.dateButton}
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </label>

        {mostrarAgrupacion && (
        <label className={styles.field}>
          <span>Agrupar por</span>
          <div className={styles.controlWrap}>
            <select
              value={filtros.agrupacion}
              onChange={(evento) => onFiltroChange('agrupacion', evento.target.value)}
              className={`${styles.control} ${styles.selectControl}`}
            >
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className={styles.controlIcon}
            />
          </div>
        </label>
        )}

        <div className={styles.filterActions}>
          <button
            type="submit"
            className={`${styles.button} ${styles.primary}`}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Aplicar
          </button>
          <button
            type="button"
            onClick={onRestablecer}
            aria-label="Restablecer filtros"
            className={`${styles.button} ${styles.iconButton}`}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {(errorFiltros || errorSucursales) && (
        <p role="alert" className={styles.alert}>
          {errorFiltros || errorSucursales}
        </p>
      )}
    </form>
  );
}
