import React from 'react';

const VISTAS = [
  ['total_productos', 'Productos', null, null],
  ['productos_agotados', 'Agotados', 'estado_stock', 'agotado'],
  ['productos_poco_stock', 'Poco stock', 'estado_stock', 'poco_stock'],
  ['productos_vencidos', 'Vencidos', 'estado_vencimiento', 'vencido'],
  ['productos_proximos_vencer', 'Próximos a vencer', 'estado_vencimiento', 'proximo_a_vencer'],
];
const numero = new Intl.NumberFormat('es-GT');

export default function InventarioResumen({ resumen, filtros, cargando, onSeleccionar }) {
  return (
    <section aria-label="Resumen de inventario" className="inventory-views">
      {VISTAS.map(([campo, etiqueta, tipo, valor]) => {
        const activa = tipo ? filtros[tipo] === valor : !filtros.estado_stock && !filtros.estado_vencimiento;
        return (
          <button key={campo} type="button" aria-pressed={activa}
            className="inventory-view" onClick={() => onSeleccionar(tipo, valor)}>
            <span>{etiqueta}</span>
            <strong className={!cargando && resumen?.[campo] > 0 && tipo ? `inventory-signal-${valor}` : ''}>
              {cargando ? '—' : numero.format(resumen?.[campo] ?? 0)}
            </strong>
          </button>
        );
      })}
    </section>
  );
}
