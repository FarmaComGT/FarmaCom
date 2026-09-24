import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import ReportesNav from '../components/reportes/ReportesNav.jsx';

export default function ReportesLayout() {
  return (
    <section aria-labelledby="titulo-reportes" className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 id="titulo-reportes" className="font-headline text-3xl font-extrabold tracking-tight text-primary">Reportes</h1>
      </header>
      <ReportesNav />
      <div className="min-h-screen">
        <Suspense fallback={(
          <div role="status" className="animate-pulse rounded-2xl bg-slate-100 p-8 text-sm text-slate-500">
            Cargando reporte…
          </div>
        )}>
          <Outlet />
        </Suspense>
      </div>
    </section>
  );
}
