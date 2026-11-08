import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { obtenerHistorialInventario } from '../../api/historialInventario';
import Paginacion from '../../components/ui/Paginacion.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import usePaginacionURL from '../../hooks/usePaginacionURL.js';
import useProductos from '../../hooks/useProductos.js';
import useSucursales from '../../hooks/useSucursales.js';
import management from '../../styles/ManagementUI.module.css';
import styles from './HistorialInventario.module.css';

const TIPOS = [
  ['alta', 'Alta'],
  ['modificacion', 'Modificación'],
  ['cambio_estado', 'Cambio de estado'],
  ['eliminacion', 'Eliminación'],
  ['entrada', 'Entrada de stock'],
  ['venta', 'Venta'],
  ['anulacion', 'Anulación de venta'],
  ['ajuste', 'Ajuste de stock'],
];

const ETIQUETAS_CAMPOS = {
  codigo: 'Código',
  nombre_comercial: 'Nombre comercial',
  nombre_generico: 'Nombre genérico',
  numero_lote: 'Lote',
  proveedor_nombre: 'Proveedor',
  id_proveedor: 'Proveedor (ID)',
  fecha_vencimiento: 'Vencimiento',
  precio_compra: 'Precio de compra',
  precio_venta: 'Precio de venta',
  precio_mayoreo: 'Precio de mayoreo',
  cantidad_mayoreo: 'Cantidad de mayoreo',
  margen_ganancia: 'Margen de ganancia',
  stock_actual: 'Existencias',
  cantidad_ingresada: 'Cantidad ingresada',
  activo: 'Estado',
  aplica_mayoreo: 'Aplica mayoreo',
  stock_minimo: 'Stock mínimo',
};

const CAMPOS_RELEVANTES = Object.keys(ETIQUETAS_CAMPOS);
const formateadorFechaHora = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium', timeStyle: 'short',
});
const formateadorFecha = new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'UTC' });
const formateadorMoneda = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });
const formateadorNumero = new Intl.NumberFormat('es-GT');

const valorComparable = (valor) => valor == null ? null : String(valor);

const formatearValor = (campo, valor) => {
  if (valor == null || valor === '') return 'Sin dato';
  if (campo.startsWith('precio_')) return formateadorMoneda.format(Number(valor));
  if (campo === 'fecha_vencimiento') return formateadorFecha.format(new Date(`${String(valor).slice(0, 10)}T00:00:00Z`));
  if (campo === 'activo') return valor === true || valor === 'true' ? 'Activo' : 'Inactivo';
  if (campo === 'aplica_mayoreo') return valor === true || valor === 'true' ? 'Sí' : 'No';
  return String(valor);
};

const cambiosDe = (evento) => {
  const anterior = evento.valores_anteriores || {};
  const nuevo = evento.valores_nuevos || {};
  const fuente = evento.tipo_cambio === 'alta' ? nuevo
    : evento.tipo_cambio === 'eliminacion' ? anterior
      : { ...anterior, ...nuevo };

  return CAMPOS_RELEVANTES
    .filter((campo) => Object.prototype.hasOwnProperty.call(fuente, campo))
    .filter((campo) => evento.tipo_cambio === 'alta'
      || evento.tipo_cambio === 'eliminacion'
      || valorComparable(anterior[campo]) !== valorComparable(nuevo[campo]))
    .map((campo) => ({
      campo,
      etiqueta: ETIQUETAS_CAMPOS[campo],
      anterior: anterior[campo],
      nuevo: nuevo[campo],
    }));
};

const leerFiltros = (params) => ({
  id_producto: params.get('producto') || '',
  lote: params.get('lote') || '',
  id_sucursal: params.get('sucursal') || '',
  fecha_desde: params.get('desde') || '',
  fecha_hasta: params.get('hasta') || '',
  usuario: params.get('usuario') || '',
  tipo_cambio: params.get('tipo') || '',
});

export default function HistorialInventario() {
  const { usuario } = useAuth();
  const { productos } = useProductos();
  const { sucursales } = useSucursales();
  const [params, setParams] = useSearchParams();
  const filtrosAplicados = useMemo(() => leerFiltros(params), [params]);
  const [borrador, setBorrador] = useState(filtrosAplicados);
  const [resultado, setResultado] = useState({
    datos: [], paginacion: { pagina: 1, limite: 25, total: 0, total_paginas: 1 },
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const { pagina, limite, crearDestino, onLimiteChange } = usePaginacionURL({
    paginacion: resultado.paginacion,
    cargando,
  });

  useEffect(() => { document.title = 'Historial de inventario · FarmaCom'; }, []);
  useEffect(() => { setBorrador(filtrosAplicados); }, [filtrosAplicados]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerHistorialInventario({
        ...Object.fromEntries(Object.entries(filtrosAplicados).filter(([, valor]) => valor)),
        pagina,
        limite,
      });
      setResultado(data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo cargar el historial de inventario.');
    } finally {
      setCargando(false);
    }
  }, [filtrosAplicados, pagina, limite]);

  useEffect(() => { cargar(); }, [cargar]);

  const escribirParametros = (filtros, nuevaPagina = 1) => {
    const siguientes = new URLSearchParams();
    const mapa = {
      producto: filtros.id_producto,
      lote: filtros.lote.trim(),
      sucursal: filtros.id_sucursal,
      desde: filtros.fecha_desde,
      hasta: filtros.fecha_hasta,
      usuario: filtros.usuario.trim(),
      tipo: filtros.tipo_cambio,
    };
    Object.entries(mapa).forEach(([clave, valor]) => {
      if (valor) siguientes.set(clave, valor);
    });
    if (nuevaPagina > 1) siguientes.set('pagina', String(nuevaPagina));
    if (limite !== 25) siguientes.set('limite', String(limite));
    setParams(siguientes);
  };

  const aplicarFiltros = (event) => {
    event.preventDefault();
    escribirParametros(borrador);
  };

  const limpiarFiltros = () => {
    const vacios = leerFiltros(new URLSearchParams());
    setBorrador(vacios);
    escribirParametros(vacios);
  };

  return (
    <section className={`${management.page} ${management.locationPage}`} aria-labelledby="historial-inventario-title">
      <header className={management.heading}>
        <div>
          <h1 id="historial-inventario-title">Historial de inventario</h1>
          <p>Auditoría de productos, lotes y movimientos de existencias.</p>
        </div>
      </header>

      <form onSubmit={aplicarFiltros} className={`${management.filterGrid} ${styles.filters}`} aria-label="Filtros del historial">
        <div className={management.field}>
          <label htmlFor="historial-producto">Producto</label>
          <select id="historial-producto" name="id_producto" className={management.input} value={borrador.id_producto} onChange={(e) => setBorrador((actual) => ({ ...actual, id_producto: e.target.value }))}>
            <option value="">Todos los productos</option>
            {productos.map((producto) => <option key={producto.id_producto} value={producto.id_producto}>{producto.nombre_comercial}</option>)}
          </select>
        </div>
        <div className={management.field}>
          <label htmlFor="historial-lote">Lote</label>
          <input id="historial-lote" name="lote" type="search" autoComplete="off" spellCheck="false" maxLength={100} className={management.input} value={borrador.lote} onChange={(e) => setBorrador((actual) => ({ ...actual, lote: e.target.value }))} placeholder="Ej.: LT-2026-01…" />
        </div>
        <div className={management.field}>
          <label htmlFor="historial-sucursal">Sucursal</label>
          <select id="historial-sucursal" name="id_sucursal" className={management.input} value={usuario?.rol === 'dependiente' ? usuario.id_sucursal || '' : borrador.id_sucursal} disabled={usuario?.rol === 'dependiente'} onChange={(e) => setBorrador((actual) => ({ ...actual, id_sucursal: e.target.value }))}>
            {usuario?.rol !== 'dependiente' && <option value="">Todas las sucursales</option>}
            {sucursales.map((sucursal) => <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre_sucursal}</option>)}
          </select>
        </div>
        <div className={management.field}>
          <label htmlFor="historial-desde">Desde</label>
          <input id="historial-desde" name="fecha_desde" type="date" className={management.input} value={borrador.fecha_desde} max={borrador.fecha_hasta || undefined} onChange={(e) => setBorrador((actual) => ({ ...actual, fecha_desde: e.target.value }))} />
        </div>
        <div className={management.field}>
          <label htmlFor="historial-hasta">Hasta</label>
          <input id="historial-hasta" name="fecha_hasta" type="date" className={management.input} value={borrador.fecha_hasta} min={borrador.fecha_desde || undefined} onChange={(e) => setBorrador((actual) => ({ ...actual, fecha_hasta: e.target.value }))} />
        </div>
        <div className={management.field}>
          <label htmlFor="historial-usuario">Usuario</label>
          <input id="historial-usuario" name="usuario" type="search" autoComplete="off" maxLength={100} className={management.input} value={borrador.usuario} onChange={(e) => setBorrador((actual) => ({ ...actual, usuario: e.target.value }))} placeholder="Ej.: María López…" />
        </div>
        <div className={management.field}>
          <label htmlFor="historial-tipo">Tipo de cambio</label>
          <select id="historial-tipo" name="tipo_cambio" className={management.input} value={borrador.tipo_cambio} onChange={(e) => setBorrador((actual) => ({ ...actual, tipo_cambio: e.target.value }))}>
            <option value="">Todos los cambios</option>
            {TIPOS.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </select>
        </div>
        <div className={styles.filterActions}>
          <button type="submit" className={`${management.button} ${management.primary}`}><Search size={15} aria-hidden="true" />Aplicar filtros</button>
          <button type="button" onClick={limpiarFiltros} className={management.button}><RotateCcw size={15} aria-hidden="true" />Limpiar</button>
        </div>
      </form>

      <p className={management.resultCount} aria-live="polite">
        <strong>{formateadorNumero.format(resultado.paginacion.total)}</strong> cambios encontrados
      </p>
      {error && <div role="alert" className={management.alert}>{error} <button type="button" onClick={cargar} className={management.button}>Reintentar</button></div>}

      <div id="listado-historial-inventario" className={management.tablePanel}>
        <table className={`${management.table} ${styles.historyTable}`}>
          <caption className={management.visuallyHidden}>Cambios del inventario</caption>
          <thead><tr><th>Fecha</th><th>Producto y lote</th><th>Cambio</th><th>Sucursal</th><th>Usuario</th><th>Detalle</th></tr></thead>
          <tbody>
            {cargando && <tr><td colSpan="6" className={management.loading}>Cargando historial…</td></tr>}
            {!cargando && !error && resultado.datos.length === 0 && <tr><td colSpan="6" className={management.empty}><strong>No hay cambios para estos filtros.</strong><span>Prueba otro rango de fechas o limpia los filtros.</span></td></tr>}
            {!cargando && !error && resultado.datos.map((evento) => {
              const cambios = cambiosDe(evento);
              const etiquetaTipo = TIPOS.find(([valor]) => valor === evento.tipo_cambio)?.[1] || evento.tipo_cambio;
              return (
                <tr key={evento.id_evento}>
                  <td data-label="Fecha" className={management.mono}>{formateadorFechaHora.format(new Date(evento.fecha))}</td>
                  <td data-label="Producto y lote"><span className={styles.entity}><strong>{evento.nombre_producto || 'Producto eliminado'}</strong><small>{evento.numero_lote ? `Lote ${evento.numero_lote}` : evento.entidad === 'producto' ? 'Catálogo de productos' : 'Sin lote'}</small></span></td>
                  <td data-label="Cambio"><span className={`${management.badge} ${evento.tipo_cambio === 'eliminacion' ? management.badgeDanger : ''}`}>{etiquetaTipo}</span></td>
                  <td data-label="Sucursal">{evento.nombre_sucursal}</td>
                  <td data-label="Usuario">{evento.nombre_usuario}</td>
                  <td data-label="Detalle">
                    <details className={styles.changeDetails}>
                      <summary>Ver cambios…</summary>
                      {evento.motivo && <p className={management.helpText}>{evento.motivo}</p>}
                      <dl className={styles.changeList}>
                        {cambios.map((cambio) => (
                          <div key={cambio.campo} className={styles.changeRow}>
                            <dt>{cambio.etiqueta}</dt>
                            <dd>{evento.tipo_cambio === 'alta' ? formatearValor(cambio.campo, cambio.nuevo) : evento.tipo_cambio === 'eliminacion' ? formatearValor(cambio.campo, cambio.anterior) : `${formatearValor(cambio.campo, cambio.anterior)} → ${formatearValor(cambio.campo, cambio.nuevo)}`}</dd>
                          </div>
                        ))}
                        {cambios.length === 0 && <div className={styles.changeRow}><dt>Referencia</dt><dd>{evento.referencia || 'Sin detalle adicional'}</dd></div>}
                      </dl>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Paginacion
        paginacion={resultado.paginacion}
        crearDestino={crearDestino}
        onLimiteChange={onLimiteChange}
        cargando={cargando}
        sustantivo="cambios"
        etiqueta="Paginación del historial de inventario"
        controles="listado-historial-inventario"
      />
    </section>
  );
}
