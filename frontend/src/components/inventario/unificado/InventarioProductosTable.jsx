import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal, LoaderCircle } from 'lucide-react';

const numero = new Intl.NumberFormat('es-GT');
const stockLabels = { normal: 'Disponible', agotado: 'Agotado', poco_stock: 'Poco stock', sin_lotes: 'Sin lotes' };
const fechaLabels = { normal: 'Sin alertas', vencido: 'Vencido', proximo_a_vencer: 'Próximo a vencer', sin_lotes: 'No aplica' };

function AccionesProducto({ producto, onEditar, onCambiarEstado, onVerHistorial, puedeVerHistorial, cambiandoEstado }) {
  const ref = useRef(null);
  useEffect(() => {
    const cerrar = (event) => {
      if (!ref.current?.open) return;
      if (event.type === 'keydown' && event.key === 'Escape') {
        ref.current.open = false;
        ref.current.querySelector('summary').focus();
      } else if (event.type === 'pointerdown' && !ref.current.contains(event.target)) ref.current.open = false;
    };
    document.addEventListener('pointerdown', cerrar);
    document.addEventListener('keydown', cerrar);
    return () => { document.removeEventListener('pointerdown', cerrar); document.removeEventListener('keydown', cerrar); };
  }, []);
  const ejecutar = (accion) => {
    ref.current.open = false;
    ref.current.querySelector('summary').focus();
    accion(producto);
  };
  return (
    <details className="inventory-row-actions" ref={ref} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
    }}>
      <summary aria-label={`Acciones de ${producto.nombre_comercial}`}><MoreHorizontal size={18} aria-hidden="true" /></summary>
      <div className="inventory-action-popover">
        <button type="button" aria-label={`Editar ${producto.nombre_comercial}`} onClick={() => ejecutar(onEditar)}>Editar producto…</button>
        {puedeVerHistorial && <button type="button" aria-label={`Ver historial de precios de ${producto.nombre_comercial}`} onClick={() => ejecutar(onVerHistorial)}>Historial de precios…</button>}
        <button type="button" disabled={cambiandoEstado} aria-label={`${producto.activo ? 'Desactivar' : 'Activar'} ${producto.nombre_comercial}`} onClick={() => {
          if (!producto.activo || window.confirm(`¿Desactivar ${producto.nombre_comercial} del catálogo?`)) ejecutar(onCambiarEstado);
        }}>{cambiandoEstado && <LoaderCircle className="inventory-spinner" size={14} aria-hidden="true" />}{producto.activo ? 'Desactivar' : 'Activar'} producto</button>
      </div>
    </details>
  );
}

export default function InventarioProductosTable({ productos, cargando, onEditar, onCambiarEstado,
  onVerHistorial, puedeVerHistorial, cambiandoEstadoId, pagina = 1, onPaginaChange,
  onLimpiar, error, onReintentar }) {
  const totalPaginas = Math.max(1, Math.ceil(productos.length / 25));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (actual - 1) * 25;
  const visibles = productos.slice(inicio, inicio + 25);
  return (
    <section className="inventory-results" aria-label="Productos en inventario" aria-busy={cargando}>
      <div className="inventory-table-scroll">
        <table className="inventory-table">
          <thead><tr><th scope="col">Producto</th><th scope="col">Categoría / Casa</th><th scope="col" className="inventory-num">Existencias</th><th scope="col">Vencimiento</th><th scope="col" className="inventory-num">Lotes</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {cargando ? Array.from({length: 6}, (_,i) => <tr key={i} className="inventory-loading-row"><td colSpan={6}><span className="sr-only">{i === 0 ? 'Cargando inventario…' : ''}</span><div className="inventory-skeleton" /></td></tr>)
              : error ? <tr><td colSpan={6}><div className="inventory-empty" role="alert"><strong>No se pudo cargar el inventario</strong><p>{error}</p><button className="inventory-button" type="button" onClick={onReintentar}>Reintentar</button></div></td></tr>
              : visibles.length === 0 ? <tr><td colSpan={6}><div className="inventory-empty"><strong>No hay productos que coincidan con los filtros.</strong><p>Prueba con otro nombre o revisa los filtros aplicados.</p>{onLimpiar && <button className="inventory-button" type="button" onClick={onLimpiar}>Limpiar búsqueda y filtros</button>}</div></td></tr>
              : visibles.map((producto) => <tr key={producto.id_producto}>
                <td className="inventory-identity" data-label="Producto"><Link className="inventory-product-name" aria-label={`Ver lotes de ${producto.nombre_comercial}`} to={`/inventario/productos/${producto.id_producto}/lotes`}>{producto.nombre_comercial}</Link>
                  <span className="inventory-product-generic">{producto.nombre_generico || 'Sin nombre genérico'}{producto.concentracion ? ` · ${producto.concentracion}` : ''}</span>
                  <span className="inventory-product-meta"><span translate="no">{producto.codigo}</span>{producto.presentacion && <span>{producto.presentacion}</span>}{!producto.activo && <span>Inactivo</span>}</span>
                </td>
                <td className="inventory-classification" data-label="Categoría / Casa"><span>{producto.categoria_nombre || '—'}</span><span>{producto.casa_nombre || '—'}</span></td>
                <td className="inventory-num inventory-stock" data-label="Existencias"><strong>{numero.format(Number(producto.stock_total || 0))}</strong><span>Mín. {numero.format(producto.stock_minimo ?? 0)}</span><span className={`inventory-stock-label inventory-signal-${producto.estado_stock}`}>{stockLabels[producto.estado_stock] || 'Sin información'}</span></td>
                <td className="inventory-expiry" data-label="Vencimiento"><span className={`inventory-signal-${producto.estado_vencimiento}`}>{fechaLabels[producto.estado_vencimiento] || 'Sin información'}</span></td>
                <td className="inventory-num inventory-lots" data-label="Lotes"><span>{numero.format(producto.total_lotes ?? 0)}</span></td>
                <td className="inventory-action-cell"><AccionesProducto producto={producto} onEditar={onEditar} onCambiarEstado={onCambiarEstado} onVerHistorial={onVerHistorial} puedeVerHistorial={puedeVerHistorial} cambiandoEstado={cambiandoEstadoId === producto.id_producto} /></td>
              </tr>)}
          </tbody>
        </table>
      </div>
      {!cargando && !error && productos.length > 25 && <nav className="inventory-pagination" aria-label="Paginación de inventario">
        <span>{numero.format(inicio + 1)}–{numero.format(Math.min(inicio + 25, productos.length))} de {numero.format(productos.length)} productos</span>
        <div><button className="inventory-button" type="button" disabled={actual === 1} onClick={() => onPaginaChange?.(actual - 1)} aria-label="Página anterior"><ChevronLeft size={16} /></button><span>Página {actual} de {totalPaginas}</span><button className="inventory-button" type="button" disabled={actual === totalPaginas} onClick={() => onPaginaChange?.(actual + 1)} aria-label="Página siguiente"><ChevronRight size={16} /></button></div>
      </nav>}
    </section>
  );
}
