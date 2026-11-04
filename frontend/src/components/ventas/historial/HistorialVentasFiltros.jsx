import React, { useRef } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import ui from '../../../styles/ManagementUI.module.css';
import styles from '../../../pages/ventas/HistorialVentas.module.css';

export default function HistorialVentasFiltros({
  filtros,
  sucursales,
  cargandoSucursales,
  errorSucursales,
  errorFiltros,
  onFiltroChange,
  onAplicar,
  onRestablecer,
}) {
  const sucursalRef = useRef(null);
  const fechaDesdeRef = useRef(null);
  const fechaHastaRef = useRef(null);

  const manejarEnvio = (event) => {
    event.preventDefault();
    const aplicado = onAplicar();
    if (aplicado !== false) return;
    const campo = !filtros.fecha_desde
      ? fechaDesdeRef.current
      : !filtros.fecha_hasta
        ? fechaHastaRef.current
        : filtros.fecha_desde > filtros.fecha_hasta
          ? fechaDesdeRef.current
          : sucursalRef.current;
    requestAnimationFrame(() => campo?.focus());
  };

  return (
    <section aria-labelledby="titulo-filtros-historial">
      <h2 id="titulo-filtros-historial" className={styles.sectionHeading}>Filtros del historial</h2>
      <form onSubmit={manejarEnvio} className={styles.filters} noValidate>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>Sucursal</span>
          <select
            ref={sucursalRef}
            name="id_sucursal"
            value={filtros.id_sucursal}
            disabled={cargandoSucursales}
            onChange={(event) => onFiltroChange('id_sucursal', event.target.value)}
            className={ui.input}
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((sucursal) => (
              <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                {sucursal.nombre_sucursal}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>Fecha inicial</span>
          <input
            ref={fechaDesdeRef}
            name="fecha_desde"
            type="date"
            value={filtros.fecha_desde}
            max={filtros.fecha_hasta || undefined}
            onChange={(event) => onFiltroChange('fecha_desde', event.target.value)}
            aria-invalid={Boolean(errorFiltros)}
            aria-describedby={errorFiltros ? 'error-filtros-historial' : undefined}
            className={ui.input}
          />
        </label>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>Fecha final</span>
          <input
            ref={fechaHastaRef}
            name="fecha_hasta"
            type="date"
            value={filtros.fecha_hasta}
            min={filtros.fecha_desde || undefined}
            onChange={(event) => onFiltroChange('fecha_hasta', event.target.value)}
            aria-invalid={Boolean(errorFiltros)}
            aria-describedby={errorFiltros ? 'error-filtros-historial' : undefined}
            className={ui.input}
          />
        </label>
        <div className={styles.filterActions}>
          <button type="button" onClick={onRestablecer} className={ui.button}>
            <RotateCcw size={16} aria-hidden="true" /> Restablecer
          </button>
          <button type="submit" className={`${ui.button} ${ui.primary}`}>
            <Search size={16} aria-hidden="true" /> Consultar
          </button>
        </div>
      </form>
      {(errorFiltros || errorSucursales) && (
        <p id="error-filtros-historial" role="alert" className={ui.alert}>
          {errorFiltros || errorSucursales}
        </p>
      )}
    </section>
  );
}
