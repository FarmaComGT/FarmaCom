import React, { useCallback, useMemo } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import useFiltrosHistorialVentas from '../hooks/useFiltrosHistorialVentas';
import useSucursales from '../hooks/useSucursales';
import HistorialVentasNav from '../components/ventas/historial/HistorialVentasNav';
import HistorialVentasFiltros from '../components/ventas/historial/HistorialVentasFiltros';
import { crearFiltrosInicialesHistorial } from '../utils/filtrosHistorialVentas';
import ui from '../styles/ManagementUI.module.css';
import styles from '../pages/ventas/HistorialVentas.module.css';

export default function HistorialVentasLayout() {
  const [params, setParams] = useSearchParams();
  const iniciales = useMemo(() => crearFiltrosInicialesHistorial(), []);
  const filtrosURL = Object.fromEntries(Object.keys(iniciales).map((campo) => [campo, params.get(campo) ?? iniciales[campo]]));
  const guardarURL = useCallback((valores) => setParams((actuales) => {
    const siguientes = new URLSearchParams(actuales);
    siguientes.delete('pagina');
    Object.entries(valores).forEach(([campo, valor]) => {
      if (valor === '') siguientes.delete(campo);
      else siguientes.set(campo, String(valor));
    });
    return siguientes;
  }), [setParams]);
  const filtros = useFiltrosHistorialVentas(undefined, { filtrosURL, guardarURL });
  const { sucursales, cargando, error } = useSucursales();

  return (
    <section aria-labelledby="titulo-historial-ventas" className={`${ui.page} ${ui.locationPage}`}>
      <header className={ui.heading}>
        <div>
          <h1 id="titulo-historial-ventas">Historial de ventas</h1>
          <p>Consulta ventas, cobros y productos registrados por sucursal.</p>
        </div>
      </header>

      <HistorialVentasNav />
      <div className={styles.content}>
        <HistorialVentasFiltros
          filtros={filtros.filtrosEdicion}
          sucursales={sucursales}
          cargandoSucursales={cargando}
          errorSucursales={error}
          errorFiltros={filtros.errorFiltros}
          onFiltroChange={filtros.actualizarFiltro}
          onAplicar={filtros.aplicarFiltros}
          onRestablecer={filtros.restablecerFiltros}
        />
        <Outlet context={{ filtros: filtros.filtrosAplicados }} />
      </div>
    </section>
  );
}
