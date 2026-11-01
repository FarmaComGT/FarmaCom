import React from 'react';
import { Layers3, PackagePlus } from 'lucide-react';
import { formatearQuetzales } from '../../utils/pos';
import { obtenerPartesCoincidentes } from '../../utils/resaltarCoincidencia';

const formatearFecha = (fecha) => {
  if (!fecha) return '';
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(fecha));
};

const TextoCoincidente = ({ texto, busqueda }) => {
  const partes = obtenerPartesCoincidentes(texto, busqueda);
  if (!partes) return texto;

  return (
    <>
      {partes.antes}
      <mark className="rounded-sm bg-amber-200/80 px-0.5 text-inherit">
        {partes.coincidencia}
      </mark>
      {partes.despues}
    </>
  );
};

export default function ProductoVentaCard({ producto, onSeleccionar, busqueda }) {
  const deshabilitado = !producto.tiene_precio;
  const esCoincidenciaAproximada = producto.tipo_coincidencia === 'aproximada';
  const cantidadLotes = Number(producto.cantidad_lotes) || producto.lotes?.length || 1;
  const precioMinimo = Number(producto.precio_minimo);
  const precioMaximo = Number(producto.precio_maximo);
  const preciosDiferentes = precioMaximo > precioMinimo;
  const promocion = Number(producto.promocion?.precio_promocion) < precioMinimo
    ? producto.promocion
    : null;

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(producto)}
      disabled={deshabilitado}
      aria-label={`Seleccionar lote de ${producto.nombre_comercial}`}
      className="pos-product"
    >
      <div className="pos-product-row">
        <div className="min-w-0">
          <p className="pos-product-name">
            <TextoCoincidente texto={producto.nombre_comercial} busqueda={busqueda} />
          </p>
          <p className="pos-product-generic">
            <TextoCoincidente texto={producto.nombre_generico} busqueda={busqueda} />
            {producto.concentracion && (
              <>
                {' · '}
                <TextoCoincidente texto={producto.concentracion} busqueda={busqueda} />
              </>
            )}
          </p>
        </div>

        <div className="pos-product-price">
          {promocion ? (
            <>
              <span className="was line-through">
                {preciosDiferentes
                  ? `${formatearQuetzales(precioMinimo)} - ${formatearQuetzales(precioMaximo)}`
                  : formatearQuetzales(precioMinimo)}
              </span>
              <span className="now">
                {formatearQuetzales(promocion.precio_promocion)}
              </span>
            </>
          ) : (
            <span className="now">
              {producto.tiene_precio
                ? preciosDiferentes
                  ? `${formatearQuetzales(precioMinimo)} - ${formatearQuetzales(precioMaximo)}`
                  : formatearQuetzales(precioMinimo)
                : 'Sin precio'}
            </span>
          )}
        </div>
      </div>

      <div className="pos-product-tags">
        {promocion && (
          <span className="pos-tag pos-tag--promo">
            Promo desde {promocion.cantidad_minima} unidades · hasta {formatearFecha(promocion.fecha_fin)}
          </span>
        )}
        <span className="pos-tag pos-tag--accent">
          Existencias: {producto.stock_disponible}
        </span>
        <span className="pos-tag pos-tag--neutral">
          <TextoCoincidente texto={producto.presentacion} busqueda={busqueda} />
        </span>
        {esCoincidenciaAproximada && (
          <span className="pos-tag pos-tag--warning">
            Coincidencia aproximada
          </span>
        )}
        <span className="pos-product-code">
          Código: <TextoCoincidente texto={producto.codigo} busqueda={busqueda} />
        </span>
      </div>

      <div className="pos-product-foot">
        <span className="flex items-center gap-1.5">
          <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
          Selecciona el lote que deseas vender
        </span>
        <span className="pos-product-lots">
          {cantidadLotes} {cantidadLotes === 1 ? 'lote disponible' : 'lotes disponibles'}
        </span>
        <PackagePlus className="h-4 w-4" aria-hidden="true" />
      </div>
    </button>
  );
}
