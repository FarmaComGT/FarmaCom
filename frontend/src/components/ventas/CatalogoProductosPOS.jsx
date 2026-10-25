import React, { useMemo, useState } from 'react';
import {
  Barcode,
  LoaderCircle,
  PackageSearch,
  RefreshCw,
  Search,
} from 'lucide-react';
import ProductoVentaCard from './ProductoVentaCard';
import { filtrarCatalogoPOS } from '../../utils/pos';

export default function CatalogoProductosPOS({
  productos,
  cargando,
  error,
  onSeleccionar,
  onRefrescar,
}) {
  const [busqueda, setBusqueda] = useState('');
  const productosFiltrados = useMemo(
    () => filtrarCatalogoPOS(productos, busqueda),
    [busqueda, productos],
  );

  const manejarTecla = (evento) => {
    if (evento.key !== 'Enter') return;

    const primerProductoDisponible = productosFiltrados.find(
      (producto) => producto.tiene_precio,
    );
    if (!primerProductoDisponible) return;

    evento.preventDefault();
    onSeleccionar(primerProductoDisponible);
  };

  return (
    <section className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-2xl bg-surface-container-low p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
              Catálogo de productos
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Busca o escanea un producto para seleccionar uno de sus lotes.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefrescar}
            disabled={cargando}
            aria-label="Actualizar catálogo"
            className="rounded-xl bg-white p-2.5 text-slate-500 shadow-sm transition-colors hover:bg-primary/5 hover:text-primary disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            onKeyDown={manejarTecla}
            placeholder="Buscar por nombre, código o presentación..."
            aria-label="Buscar productos"
            className="w-full rounded-xl border-none bg-white py-4 pl-12 pr-12 text-sm font-medium shadow-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/20"
          />
          <Barcode className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/60" />
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
        {cargando && (
          <div className="flex h-full min-h-72 flex-col items-center justify-center text-slate-500">
            <LoaderCircle className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold">Cargando catálogo...</p>
          </div>
        )}

        {!cargando && error && (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-error/15 bg-error-container/30 px-6 text-center">
            <p className="font-headline font-bold text-on-error-container">{error}</p>
            <button
              type="button"
              onClick={onRefrescar}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {!cargando && !error && productosFiltrados.length === 0 && (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center text-slate-500">
            <PackageSearch className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-headline font-bold text-slate-700">
              No se encontraron productos
            </p>
            <p className="mt-1 max-w-sm text-sm">
              Revisa la búsqueda o confirma que existan lotes vigentes con precio y stock.
            </p>
          </div>
        )}

        {!cargando && !error && productosFiltrados.map((producto) => (
          <ProductoVentaCard
            key={producto.id_producto}
            producto={producto}
            onSeleccionar={onSeleccionar}
          />
        ))}
      </div>

      {!cargando && !error && (
        <p className="mt-4 text-right text-xs font-semibold text-slate-400">
          {productosFiltrados.length} de {productos.length} opciones disponibles
        </p>
      )}
    </section>
  );
}
