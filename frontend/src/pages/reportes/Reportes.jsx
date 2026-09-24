import React from 'react';
import ReporteFiltros from '../../components/reportes/ReporteFiltros.jsx';
import ResumenVentasGrid from '../../components/reportes/ResumenVentasGrid.jsx';
import VentasPeriodoChart from '../../components/reportes/VentasPeriodoChart.jsx';
import MetodosPagoChart from '../../components/reportes/MetodosPagoChart.jsx';
import TopProductosTable from '../../components/reportes/TopProductosTable.jsx';
import useFiltrosReportes from '../../hooks/useFiltrosReportes.js';
import useReportes from '../../hooks/useReportes.js';
import useSucursales from '../../hooks/useSucursales.js';

export default function Reportes() {
  const {
    filtrosEdicion,
    filtrosAplicados,
    errorFiltros,
    actualizarFiltro,
    aplicarFiltros,
    cambiarCriterio,
    restablecerFiltros,
  } = useFiltrosReportes();
  const {
    resumen,
    serie,
    metodosPago,
    topProductos,
    recargar,
  } = useReportes(filtrosAplicados);
  const {
    sucursales,
    cargando: cargandoSucursales,
    error: errorSucursales,
  } = useSucursales();

  return (
    <div className="space-y-6">
      <ReporteFiltros
        filtros={filtrosEdicion}
        sucursales={sucursales}
        cargandoSucursales={cargandoSucursales}
        errorSucursales={errorSucursales}
        errorFiltros={errorFiltros}
        onFiltroChange={actualizarFiltro}
        onAplicar={aplicarFiltros}
        onRestablecer={restablecerFiltros}
      />

      <ResumenVentasGrid
        datos={resumen.datos}
        cargando={resumen.cargando}
        error={resumen.error}
        onReintentar={recargar}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <VentasPeriodoChart
          datos={serie.datos}
          agrupacion={filtrosAplicados.agrupacion}
          cargando={serie.cargando}
          error={serie.error}
          onReintentar={recargar}
        />
        <MetodosPagoChart
          datos={metodosPago.datos}
          cargando={metodosPago.cargando}
          error={metodosPago.error}
          onReintentar={recargar}
        />
      </div>

      <TopProductosTable
        datos={topProductos.datos}
        criterio={filtrosAplicados.criterio}
        cargando={topProductos.cargando}
        error={topProductos.error}
        onCriterioChange={cambiarCriterio}
        onReintentar={recargar}
      />
    </div>
  );
}
