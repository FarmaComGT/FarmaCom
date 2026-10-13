import React, { useState } from 'react';
import {
  Barcode,
  LoaderCircle,
  PackageSearch,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { obtenerTextoMasCoincidente } from '../../utils/resaltarCoincidencia';
import ProductoVentaCard from './ProductoVentaCard';

export default function AutocompletadoProductosPOS({
  busqueda,
  onBusquedaChange,
  productos,
  cargando,
  error,
  onAgregar,
  onBuscarAhora,
  onRefrescar,
}) {
  const [procesandoEnter, setProcesandoEnter] = useState(false);
  const hayBusqueda = Boolean(busqueda.trim());
  const hayCoincidenciasAproximadas = productos.some(
    (producto) => producto.tipo_coincidencia === 'aproximada',
  );
  const soloHayCoincidenciasAproximadas = productos.length > 0 && productos.every(
    (producto) => producto.tipo_coincidencia === 'aproximada',
  );
  const sugerencia = soloHayCoincidenciasAproximadas
    ? obtenerTextoMasCoincidente([
      productos[0]?.nombre_comercial,
      productos[0]?.nombre_generico,
      productos[0]?.codigo,
    ], busqueda)
    : null;

  const manejarTecla = async (evento) => {
    if (evento.key !== 'Enter' || !hayBusqueda || procesandoEnter) return;

    evento.preventDefault();
    setProcesandoEnter(true);
    const resultados = await onBuscarAhora(busqueda);
    const primerProducto = resultados.find((producto) => producto.tiene_precio);

    if (primerProducto) {
      onAgregar(primerProducto);
      onBusquedaChange('');
    }
    setProcesandoEnter(false);
  };

  const buscando = cargando || procesandoEnter;

  return (
    <section className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-2xl bg-surface-container-low p-5 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
              Buscar productos
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Escribe un nombre, presentación o escanea el código.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefrescar}
            disabled={buscando || !hayBusqueda}
            aria-label="Actualizar resultados"
            className="rounded-xl bg-white p-2.5 text-slate-500 shadow-sm transition-colors hover:bg-primary/5 hover:text-primary disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${buscando ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            type="search"
            value={busqueda}
            onChange={(evento) => onBusquedaChange(evento.target.value)}
            onKeyDown={manejarTecla}
            placeholder="Ej. paracetamol, MED-001..."
            aria-label="Buscar productos"
            className="w-full rounded-xl border-none bg-white py-4 pl-12 pr-20 text-sm font-medium shadow-sm outline-none transition-shadow [&::-webkit-search-cancel-button]:appearance-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {hayBusqueda && (
              <button
                type="button"
                onClick={() => onBusquedaChange('')}
                aria-label="Limpiar búsqueda"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Barcode className="h-5 w-5 text-primary/60" />
          </div>
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {!hayBusqueda && (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center text-slate-500">
            <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
              <PackageSearch className="h-10 w-10 text-primary/50" />
            </div>
            <p className="font-headline font-bold text-slate-700">Encuentra un producto</p>
            <p className="mt-1 max-w-sm text-sm">
              Los resultados aparecerán mientras escribes. Presiona Enter para agregar el primero.
            </p>
          </div>
        )}

        {hayBusqueda && buscando && (
          <div className="flex min-h-72 flex-col items-center justify-center text-slate-500">
            <LoaderCircle className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold">Buscando productos disponibles...</p>
          </div>
        )}

        {hayBusqueda && !buscando && error && (
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

        {hayBusqueda && !buscando && !error && productos.length === 0 && (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center text-slate-500">
            <PackageSearch className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-headline font-bold text-slate-700">Sin coincidencias disponibles</p>
            <p className="mt-1 max-w-sm text-sm">
              No encontramos productos vendibles con esa búsqueda.
            </p>
            <div className="mt-4 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              <p className="font-headline text-sm font-extrabold">¿Quiso decir…?</p>
              <p className="mt-1 text-xs font-medium">
                Prueba con el nombre genérico, una presentación o menos caracteres.
              </p>
            </div>
          </div>
        )}

        {hayBusqueda && !buscando && !error && sugerencia && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
          >
            <div className="min-w-0 text-sm">
              <p className="font-headline font-extrabold">¿Quiso decir…?</p>
              <button
                type="button"
                onClick={() => onBusquedaChange(sugerencia)}
                aria-label={`Buscar ${sugerencia}`}
                className="mt-1 max-w-full truncate font-bold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
              >
                {sugerencia}
              </button>
              <p className="mt-1 text-xs font-medium text-amber-800">
                Mostramos los productos disponibles con el nombre más cercano.
              </p>
            </div>
          </div>
        )}

        {hayBusqueda && !buscando && !error && productos.map((producto) => (
          <ProductoVentaCard
            key={producto.carritoKey}
            producto={producto}
            onAgregar={onAgregar}
            busqueda={busqueda}
          />
        ))}
      </div>

      {hayBusqueda && !buscando && !error && productos.length > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-primary/5 pt-4 text-xs font-semibold text-slate-400">
          <span>
            {soloHayCoincidenciasAproximadas
              ? 'Mostrando las opciones más cercanas'
              : hayCoincidenciasAproximadas
              ? 'Las coincidencias aproximadas aparecen después de las directas'
              : 'Enter agrega la primera opción'}
          </span>
          <span>{productos.length} {productos.length === 1 ? 'resultado' : 'resultados'}</span>
        </div>
      )}
    </section>
  );
}
