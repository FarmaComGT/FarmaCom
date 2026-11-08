import React from 'react';
import {
  LoaderCircle,
  PackageSearch,
  RefreshCw,
} from 'lucide-react';
import { obtenerTextoMasCoincidente } from '../../utils/resaltarCoincidencia';
import ProductoVentaCard from './ProductoVentaCard';
import LecturaCodigoPOS from './LecturaCodigoPOS';

export default function AutocompletadoProductosPOS({
  busqueda,
  onBusquedaChange,
  productos,
  cargando,
  error,
  onSeleccionar,
  onBuscarAhora,
  onRefrescar,
  onSeleccionarCodigo = onSeleccionar,
  bloqueado,
  contexto,
}) {
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

  const buscando = cargando;

  return (
    <section className="pos-panel" aria-label="Búsqueda y resultados del catálogo">
      <div className="pos-search-head">
        <div>
          <h2 id="titulo-busqueda-productos">Buscar productos</h2>
          <p>Nombre, presentación o código de barras</p>
        </div>
        <button
          type="button"
          onClick={onRefrescar}
          disabled={buscando || !hayBusqueda}
          aria-label="Actualizar resultados"
          title="Actualizar resultados"
          className="pos-search-refresh"
        >
          <RefreshCw className={`h-4 w-4 ${buscando ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <LecturaCodigoPOS busqueda={busqueda} onBusquedaChange={onBusquedaChange}
        onSeleccionar={onSeleccionarCodigo}
        onBuscarAhora={onBuscarAhora} contexto={contexto} bloqueado={bloqueado} />

      <div className="pos-search-results" aria-live="polite" aria-busy={buscando}>
        {!hayBusqueda && (
          <div className="pos-search-empty">
            <span className="pos-search-empty-icon">
              <PackageSearch aria-hidden="true" />
            </span>
            <strong>Encuentra un producto</strong>
            <p>
              Los resultados aparecerán mientras escribes. Selecciona un producto para ver sus lotes.
            </p>
          </div>
        )}

        {hayBusqueda && buscando && (
          <div className="pos-search-loading">
            <LoaderCircle className="animate-spin" aria-hidden="true" />
            <p>Buscando productos disponibles…</p>
          </div>
        )}

        {hayBusqueda && !buscando && error && (
          <div className="pos-search-error" role="alert">
            <strong>No pudimos cargar los resultados</strong>
            <p>{error}</p>
            <button type="button" onClick={onRefrescar}>
              Intentar de nuevo
            </button>
          </div>
        )}

        {hayBusqueda && !buscando && !error && productos.length === 0 && (
          <div className="pos-search-empty">
            <span className="pos-search-empty-icon">
              <PackageSearch aria-hidden="true" />
            </span>
            <strong>Sin coincidencias disponibles</strong>
            <p>
              No encontramos productos vendibles con esa búsqueda.
            </p>
            <div className="pos-suggestion pos-suggestion--empty">
              <strong>¿Quiso decir…?</strong>
              <p className="pos-suggestion-note">
                Prueba con el nombre genérico, una presentación o menos caracteres.
              </p>
            </div>
          </div>
        )}

        {hayBusqueda && !buscando && !error && sugerencia && (
          <div role="status" className="pos-suggestion">
            <strong>¿Quiso decir…?</strong>
            <button
              type="button"
              onClick={() => onBusquedaChange(sugerencia)}
              aria-label={`Buscar ${sugerencia}`}
            >
              {sugerencia}
            </button>
            <p className="pos-suggestion-note">
              Mostramos los productos disponibles con el nombre más cercano.
            </p>
          </div>
        )}

        {hayBusqueda && !buscando && !error && productos.map((producto) => (
          <ProductoVentaCard
            key={producto.id_producto}
            producto={producto}
            onSeleccionar={onSeleccionar}
            busqueda={busqueda}
          />
        ))}
      </div>

      {hayBusqueda && !buscando && !error && productos.length > 0 && (
        <div className="pos-search-footer">
          <span>
            {soloHayCoincidenciasAproximadas
              ? 'Mostrando las opciones más cercanas'
              : hayCoincidenciasAproximadas
              ? 'Las coincidencias aproximadas aparecen después de las directas'
              : 'Selecciona un producto o presiona Enter para buscar un código exacto'}
          </span>
          <span>{productos.length} {productos.length === 1 ? 'resultado' : 'resultados'}</span>
        </div>
      )}
    </section>
  );
}
