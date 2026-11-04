import React, { useEffect, useState } from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ui from '../../components/caja/CajaUI.module.css';
import styles from './HistorialCaja.module.css';
import { obtenerCajas } from '../../api/cajas';
import useHistorialCaja from '../../hooks/useHistorialCaja';
import useSucursales from '../../hooks/useSucursales';
import { useAuth } from '../../context/AuthContext';
import CajaSubNav from '../../components/caja/CajaSubNav';
import ResumenDiarioCaja from '../../components/caja/ResumenDiarioCaja';
import Paginacion from '../../components/ui/Paginacion';
import usePaginacionURL, { leerPaginacionURL } from '../../hooks/usePaginacionURL';

const FILTROS_INICIALES = {
  id_sucursal: '',
  id_caja: '',
  fecha_desde: '',
  fecha_hasta: '',
};

const formatearMoneda = (valor) => new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
}).format(Number(valor || 0));

const formatearFecha = (valor) => {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor));
};

export default function HistorialCaja() {
  const { usuario } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const filtros = Object.fromEntries(Object.keys(FILTROS_INICIALES).map((campo) => [campo, parametros.get(campo) || '']));
  const claveFiltros = JSON.stringify(filtros);
  const [borrador, setBorrador] = useState(filtros);
  useEffect(() => { setBorrador(JSON.parse(claveFiltros)); }, [claveFiltros]);
  useEffect(() => { document.title = 'Historial de cierres · FarmaCom'; }, []);
  const setFiltros = (valores) => setParametros((actuales) => {
    const siguientes = new URLSearchParams(actuales);
    Object.entries(valores).forEach(([campo, valor]) => valor ? siguientes.set(campo, valor) : siguientes.delete(campo));
    siguientes.delete('pagina');
    return siguientes;
  });
  const [cajas, setCajas] = useState([]);
  const [cargandoCajas, setCargandoCajas] = useState(false);
  const [errorCajas, setErrorCajas] = useState(null);
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales } = useSucursales();
  const { pagina, limite } = leerPaginacionURL(parametros);
  const { cierres, paginacion, cargando, error, recargar } = useHistorialCaja({ ...filtros, pagina, limite });
  const { crearDestino, onLimiteChange } = usePaginacionURL({ paginacion, cargando });

  useEffect(() => {
    if (!borrador.id_sucursal) {
      setCajas([]);
      setErrorCajas(null);
      return undefined;
    }

    const controller = new AbortController();
    const cargarCajas = async () => {
      setCargandoCajas(true);
      setErrorCajas(null);
      try {
        const resultado = await obtenerCajas(
          { id_sucursal: borrador.id_sucursal },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setCajas(resultado);
      } catch (errorSolicitud) {
        if (!controller.signal.aborted) {
          setCajas([]);
          setErrorCajas(
            errorSolicitud?.response?.data?.mensaje || 'No se pudieron cargar las cajas.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setCargandoCajas(false);
      }
    };

    cargarCajas();
    return () => controller.abort();
  }, [borrador.id_sucursal]);

  const cambiarFiltro = (evento) => {
    const { name, value } = evento.target;
    setBorrador((actual) => ({
      ...actual,
      [name]: value,
      ...(name === 'id_sucursal' ? { id_caja: '' } : {}),
    }));
  };

  const aplicarFiltros = (evento) => {
    evento.preventDefault();
    setFiltros(borrador);
  };

  const limpiarFiltros = () => {
    setBorrador(FILTROS_INICIALES);
    setFiltros(FILTROS_INICIALES);
  };

  return (
    <div className={ui.page}>
      <header className={ui.heading}><div><h1>Historial de cierres</h1><p>Actividad diaria y conciliación de efectivo por sucursal.</p></div></header>
      <CajaSubNav rol={usuario?.rol} />
      <ResumenDiarioCaja idSucursalInicial={usuario?.id_sucursal} />
      <section aria-labelledby="titulo-filtros-historial">
        <h2 id="titulo-filtros-historial" className={ui.sectionHeading}>Filtros para el historial</h2>
        <form onSubmit={aplicarFiltros} className={styles.filters}>
          <div className={ui.field}><label htmlFor="filtro-sucursal">Sucursal</label><select id="filtro-sucursal" name="id_sucursal" value={borrador.id_sucursal} onChange={cambiarFiltro} disabled={cargandoSucursales} className={ui.input}><option value="">Todas las sucursales</option>{sucursales.map((sucursal) => <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre_sucursal}</option>)}</select></div>
          <div className={ui.field}><label htmlFor="filtro-caja">Caja</label><select id="filtro-caja" name="id_caja" value={borrador.id_caja} onChange={cambiarFiltro} disabled={!borrador.id_sucursal || cargandoCajas} className={ui.input}><option value="">{cargandoCajas ? 'Cargando cajas…' : 'Todas las cajas'}</option>{cajas.map((caja) => <option key={caja.id_caja} value={caja.id_caja}>{caja.nombre}</option>)}</select></div>
          <div className={ui.field}><label htmlFor="fecha-desde">Desde</label><input id="fecha-desde" name="fecha_desde" type="date" value={borrador.fecha_desde} onChange={cambiarFiltro} max={borrador.fecha_hasta || undefined} className={ui.input} /></div>
          <div className={ui.field}><label htmlFor="fecha-hasta">Hasta</label><input id="fecha-hasta" name="fecha_hasta" type="date" value={borrador.fecha_hasta} onChange={cambiarFiltro} min={borrador.fecha_desde || undefined} className={ui.input} /></div>
          <div className={styles.filterActions}><button type="button" onClick={limpiarFiltros} className={ui.button}>Limpiar</button><button type="submit" disabled={cargando} className={`${ui.button} ${ui.primary}`}>{cargando ? <LoaderCircle size={16} className={ui.spinner} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}Aplicar filtros</button></div>
        </form>
      </section>
      {(error || errorCajas || errorSucursales) && <div role="alert" className={`${ui.notice} ${ui.error}`}>{error || errorCajas || errorSucursales}{error && <button type="button" className={ui.button} onClick={recargar}>Reintentar</button>}</div>}
      <section id="historial-cierres" aria-labelledby="titulo-cierres" aria-busy={cargando}>
        <div className={styles.resultsHeader}><h2 id="titulo-cierres" className={ui.sectionHeading}>Cierres registrados</h2>{!cargando && !error && <p className={ui.count} aria-live="polite">{new Intl.NumberFormat('es-GT').format(paginacion?.total ?? 0)} resultados</p>}</div>
        {cargando ? <div role="status" className={ui.loading}>Cargando historial…{Array.from({length: 3}, (_,i) => <span key={i} className={ui.skeleton} />)}</div>
        : error ? null
        : cierres.length === 0 ? <div className={ui.empty}><p>No hay cierres que coincidan con los filtros seleccionados.</p><button type="button" onClick={limpiarFiltros} className={ui.button}>Limpiar filtros</button></div>
        : <>
          <table className={styles.table}>
            <thead><tr><th scope="col">Fecha / turno</th><th scope="col">Sucursal / caja</th><th scope="col">Ventas</th><th scope="col">Esperado</th><th scope="col">Contado</th><th scope="col">Diferencia</th></tr></thead>
            <tbody>{cierres.map((cierre) => {
              const diferencia = Number(cierre.diferencia_efectivo);
              return <tr key={cierre.id_sesion_caja}>
                <td>{formatearFecha(cierre.fecha_hora_cierre)}<span className={`${styles.subline} ${styles.turno}`}>{cierre.turno}</span></td>
                <td><strong>{cierre.nombre_sucursal}</strong><span className={styles.subline}>{cierre.nombre_caja}</span><span className={styles.subline}>Cerró: {cierre.usuario_cierre}</span></td>
                <td data-label="Ventas"><strong>{formatearMoneda(cierre.total_ventas)}</strong></td>
                <td data-label="Esperado">{formatearMoneda(cierre.efectivo_esperado)}</td>
                <td data-label="Contado">{formatearMoneda(cierre.efectivo_contado)}</td>
                <td data-label="Diferencia" className={diferencia < 0 ? styles.negative : diferencia > 0 ? styles.positive : ''}><strong>{formatearMoneda(cierre.diferencia_efectivo)}</strong><span className={styles.resultLabel}>{diferencia < 0 ? 'Faltante' : diferencia > 0 ? 'Sobrante' : 'Cuadrada'}</span></td>
              </tr>;
            })}</tbody>
          </table>
        </>}
        {!error && <Paginacion paginacion={paginacion} crearDestino={crearDestino} onLimiteChange={onLimiteChange}
          cargando={cargando} sustantivo="cierres" controles="historial-cierres" />}
      </section>
    </div>
  );
}
