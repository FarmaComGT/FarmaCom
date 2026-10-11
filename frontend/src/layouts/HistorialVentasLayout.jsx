import React from 'react';
import { Outlet } from 'react-router-dom';
import { History } from 'lucide-react';
import useFiltrosHistorialVentas from '../hooks/useFiltrosHistorialVentas';
import useSucursales from '../hooks/useSucursales';
import HistorialVentasNav from '../components/ventas/historial/HistorialVentasNav';
import HistorialVentasFiltros from '../components/ventas/historial/HistorialVentasFiltros';

export default function HistorialVentasLayout() {
  const filtros = useFiltrosHistorialVentas();
  const { sucursales, cargando, error } = useSucursales();

  return (
    <section aria-labelledby="titulo-historial-ventas" className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <History className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 id="titulo-historial-ventas" className="font-headline text-3xl font-extrabold tracking-tight text-primary">
            Historial de ventas
          </h1>
          <p className="mt-1 text-sm text-slate-500">Consulta las ventas y sus productos acumulados.</p>
        </div>
      </header>

      <HistorialVentasNav />
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
    </section>
  );
}
