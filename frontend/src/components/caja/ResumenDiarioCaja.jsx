import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ui from './CajaUI.module.css';
import styles from './ResumenDiarioCaja.module.css';
import { obtenerCajas } from '../../api/cajas';
import useResumenCaja from '../../hooks/useResumenCaja';
import useSucursales from '../../hooks/useSucursales';

const obtenerFechaLocal = () => {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const formatearMoneda = (valor) => new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
}).format(Number(valor || 0));

export default function ResumenDiarioCaja({ idSucursalInicial = '' }) {
  const [parametros, setParametros] = useSearchParams();
  const [hoy] = useState(obtenerFechaLocal);
  const fecha = parametros.get('resumen_fecha') ?? hoy;
  const idSucursal = parametros.get('resumen_sucursal') ?? String(idSucursalInicial || '');
  const idCaja = parametros.get('resumen_caja') || '';
  const actualizarVista = (cambios) => setParametros((actuales) => { const siguientes = new URLSearchParams(actuales); Object.entries(cambios).forEach(([campo, valor]) => siguientes.set(campo, valor)); return siguientes; }, {replace: true});
  const [cajas, setCajas] = useState([]);
  const [cargandoCajas, setCargandoCajas] = useState(false);
  const [errorCajas, setErrorCajas] = useState(null);
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales } = useSucursales();
  const { resumen, cargando, error } = useResumenCaja(fecha, idSucursal, idCaja);

  useEffect(() => {
    if (!idSucursal) {
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
          { id_sucursal: idSucursal, activa: true },
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
  }, [idSucursal]);

  const cambiarSucursal = (evento) => {
    actualizarVista({resumen_sucursal: evento.target.value, resumen_caja: ''});
  };
  const totales = resumen.reduce((acumulado, fila) => ({
    ventasEfectivo: acumulado.ventasEfectivo + Number(fila.ventas_efectivo || 0),
    ventasTarjeta: acumulado.ventasTarjeta + Number(fila.ventas_tarjeta || 0),
    entradas: acumulado.entradas + Number(fila.entradas || 0),
    salidas: acumulado.salidas + Number(fila.salidas || 0),
    diferencia: acumulado.diferencia + Number(fila.diferencia_efectivo || 0),
    sesionesCerradas: acumulado.sesionesCerradas + Number(fila.sesiones_cerradas || 0),
    sesionesAbiertas: acumulado.sesionesAbiertas + Number(fila.sesiones_abiertas || 0),
  }), {
    ventasEfectivo: 0,
    ventasTarjeta: 0,
    entradas: 0,
    salidas: 0,
    diferencia: 0,
    sesionesCerradas: 0,
    sesionesAbiertas: 0,
  });

  return (
    <section className={styles.section} aria-labelledby="titulo-resumen-diario" aria-busy={cargando}>
      <h2 id="titulo-resumen-diario" className={ui.sectionHeading}>Resumen diario</h2>
      <p className={ui.description}>Ventas y movimientos de efectivo del día seleccionado.</p>
      <div className={styles.filters}>
        <div className={ui.field}><label htmlFor="sucursal-resumen">Sucursal</label><select id="sucursal-resumen" name="resumen_sucursal" value={idSucursal} onChange={cambiarSucursal} disabled={cargandoSucursales} className={ui.input}><option value="">Selecciona una sucursal</option>{sucursales.map((sucursal) => <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre_sucursal}</option>)}</select></div>
        <div className={ui.field}><label htmlFor="caja-resumen">Caja</label><select id="caja-resumen" name="resumen_caja" value={idCaja} onChange={(evento) => actualizarVista({resumen_caja: evento.target.value})} disabled={!idSucursal || cargandoCajas} className={ui.input}><option value="">{cargandoCajas ? 'Cargando cajas…' : 'Todas las cajas'}</option>{cajas.map((caja) => <option key={caja.id_caja} value={caja.id_caja}>{caja.nombre}</option>)}</select></div>
        <div className={ui.field}><label htmlFor="fecha-resumen">Día que deseas consultar</label><input id="fecha-resumen" name="resumen_fecha" type="date" value={fecha} onChange={(evento) => actualizarVista({resumen_fecha: evento.target.value})} className={ui.input} /></div>
      </div>
      {(error || errorCajas || errorSucursales) && <div role="alert" className={`${ui.notice} ${ui.error}`}>{error || errorCajas || errorSucursales}</div>}
      {!idSucursal ? <div className={ui.empty}>Selecciona una sucursal para consultar el resumen diario.</div>
      : !fecha ? <div className={ui.empty}>Selecciona una fecha para consultar el resumen diario.</div>
      : cargando ? <div role="status" className={ui.loading}>Cargando resumen diario…<div className={styles.totals}>{Array.from({length:4}, (_,i) => <div key={i}><span className={ui.skeleton} /><span className={ui.skeleton} /></div>)}</div></div>
      : error || errorCajas || errorSucursales ? null : <>
        <dl className={styles.totals}>
          {[{etiqueta: 'Ventas en efectivo', valor: totales.ventasEfectivo}, {etiqueta: 'Ventas con tarjeta', valor: totales.ventasTarjeta}, {etiqueta: 'Entradas de efectivo', valor: totales.entradas}, {etiqueta: 'Salidas de efectivo', valor: totales.salidas}].map(({etiqueta, valor}) => <div key={etiqueta}><dt>{etiqueta}</dt><dd>{formatearMoneda(valor)}</dd></div>)}
        </dl>
        <dl className={styles.secondary}>
          <div><dt>Diferencia acumulada</dt><dd className={totales.diferencia < 0 ? styles.negative : totales.diferencia > 0 ? styles.positive : ''}>{formatearMoneda(totales.diferencia)}</dd></div>
          <div><dt>Sesiones cerradas</dt><dd>{totales.sesionesCerradas}</dd></div>
          <div><dt>Sesiones abiertas</dt><dd>{totales.sesionesAbiertas}</dd></div>
        </dl>
        {resumen.length === 0 && <p className={ui.empty}>No hay actividad de caja para la fecha seleccionada.</p>}
      </>}
    </section>
  );
}
