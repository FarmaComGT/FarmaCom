import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Send, LoaderCircle, RefreshCw } from 'lucide-react';
import * as api from '../../api/resumenDiario';
import { useToast } from '../../context/ToastContext';
import useSucursales from '../../hooks/useSucursales';
import ConfiguracionResumenDiario from '../../components/reportes/ConfiguracionResumenDiario';
import ContentState from '../../components/ui/ContentState';
import Paginacion from '../../components/ui/Paginacion';
import { formatearMoneda } from '../../utils/reportes';
import styles from '../../styles/ResumenDiario.module.css';

const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
  && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v && v <= hoy();
const fechaTexto = (v) => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${v}T12:00:00Z`));
const horaTexto = (v) => new Intl.DateTimeFormat('es-GT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(v));
const estados = { pendiente: 'En cola', procesando: 'Enviando', aceptado: 'Aceptado por el servidor', fallido: 'Falló el envío', incierto: 'Requiere revisión' };

export default function ResumenDiario() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const fecha = params.has('fecha') ? params.get('fecha') : hoy();
  const pagina = /^[1-9]\d*$/.test(params.get('pagina') || '') ? Math.min(1000000, Number(params.get('pagina'))) : 1;
  const limite = [10, 25, 50].includes(Number(params.get('limite'))) ? Number(params.get('limite')) : 10;
  const detalle = params.get('detalle');
  const [config, setConfig] = React.useState(null);
  const [errorConfig, setErrorConfig] = React.useState('');
  const [revisionConfig, setRevisionConfig] = React.useState(0);
  const [dirty, setDirty] = React.useState(false);
  const [preview, setPreview] = React.useState(null);
  const [errorPreview, setErrorPreview] = React.useState('');
  const [cargandoPreview, setCargandoPreview] = React.useState(false);
  const [historial, setHistorial] = React.useState(null);
  const [errorHistorial, setErrorHistorial] = React.useState('');
  const [cargandoHistorial, setCargandoHistorial] = React.useState(false);
  const [revision, setRevision] = React.useState(0);
  const [ocupado, setOcupado] = React.useState('');
  const [envios, setEnvios] = React.useState(null);
  const [errorEnvios, setErrorEnvios] = React.useState('');
  const enlaceDetalle = React.useRef(null);
  const detalleAnterior = React.useRef(null);
  const sucursales = useSucursales();
  const ruta = (cambios) => {
    const nuevos = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => v == null ? nuevos.delete(k) : nuevos.set(k, String(v)));
    return `?${nuevos}`;
  };
  React.useEffect(() => { document.title = 'Envío de resumen · FarmaCom'; }, []);
  React.useEffect(() => {
    if (detalle) document.getElementById('titulo-detalle-envio')?.focus();
    else if (detalleAnterior.current) {
      if (enlaceDetalle.current?.isConnected) enlaceDetalle.current.focus();
      else document.getElementById('titulo-historial')?.focus();
    }
    detalleAnterior.current = detalle;
  }, [detalle]);
  React.useEffect(() => {
    const controller = new AbortController();
    setErrorConfig('');
    api.obtenerConfiguracion(controller.signal).then((d) => { if (!controller.signal.aborted) setConfig(d); }).catch(async (e) => {
      if (!controller.signal.aborted) setErrorConfig(await api.mensajeError(e, 'No se pudo cargar la configuración.'));
    });
    return () => controller.abort();
  }, [revisionConfig]);
  React.useEffect(() => {
    if (!config || !fechaValida(fecha)) return;
    const controller = new AbortController();
    setCargandoPreview(true); setErrorPreview('');
    api.obtenerVistaPrevia(fecha, config, controller.signal).then((d) => { if (!controller.signal.aborted) setPreview(d); })
      .catch(async (e) => { if (!controller.signal.aborted) setErrorPreview(await api.mensajeError(e, 'No se pudo consultar el corte.')); })
      .finally(() => { if (!controller.signal.aborted) setCargandoPreview(false); });
    return () => controller.abort();
  }, [fecha, config, revision]);
  React.useEffect(() => {
    const controller = new AbortController();
    setCargandoHistorial(true); setErrorHistorial('');
    api.obtenerHistorial(pagina, limite, controller.signal).then((d) => {
      if (controller.signal.aborted) return;
      setHistorial(d);
      const max = Math.max(1, Math.ceil(d.paginacion.total / limite));
      if (pagina > max) setParams((anteriores) => { const p = new URLSearchParams(anteriores); p.set('pagina', max); return p; }, { replace: true });
    }).catch(async (e) => { if (!controller.signal.aborted) setErrorHistorial(await api.mensajeError(e, 'No se pudo cargar el historial.')); })
      .finally(() => { if (!controller.signal.aborted) setCargandoHistorial(false); });
    return () => controller.abort();
  }, [pagina, limite, revision, setParams]);
  React.useEffect(() => {
    const pendientes = historial?.datos.some((r) => ['pendiente', 'procesando'].includes(r.envio?.estado));
    if (!pendientes) return;
    const intervalo = window.setInterval(() => { if (!document.hidden) setRevision((v) => v + 1); }, 15000);
    return () => window.clearInterval(intervalo);
  }, [historial]);
  React.useEffect(() => {
    setEnvios(null); setErrorEnvios('');
    if (!detalle) return;
    if (!/^\d+$/.test(detalle)) { setErrorEnvios('El identificador del corte no es válido.'); return; }
    const controller = new AbortController();
    api.obtenerEnvios(detalle, controller.signal).then((d) => { if (!controller.signal.aborted) setEnvios(d); })
      .catch(async (e) => { if (!controller.signal.aborted) setErrorEnvios(await api.mensajeError(e, 'No se pudo consultar el envío.')); });
    return () => controller.abort();
  }, [detalle, revision]);
  const guardar = async (datos) => {
    try { setConfig(await api.guardarConfiguracion(datos)); toast.success('Configuración guardada.'); }
    catch (e) { throw new Error(await api.mensajeError(e, 'No se pudo guardar la configuración.')); }
  };
  const accion = async (tipo, reporte) => {
    if (ocupado) return;
    if (!config) { toast.warning('Espera a que se cargue la configuración o vuelve a intentarlo.'); return; }
    if (!reporte && dirty) { toast.warning('Guarda o descarta los cambios de configuración antes de generar el corte.'); return; }
    if (!reporte && !fechaValida(fecha)) { document.getElementById('fecha-resumen')?.focus(); return; }
    if (tipo === 'enviar' && !config?.correo_destinatario) { toast.warning('Configura un correo destinatario antes de enviar.'); document.getElementById('resumen-correo')?.focus(); return; }
    setOcupado(`${tipo}-${reporte?.id_reporte || 'nuevo'}`);
    try {
      const corte = reporte || await api.crearCorte(fecha);
      if (tipo === 'descargar') await api.descargarCorte(corte.id_reporte);
      else {
        const envio = await api.enviarCorte(corte.id_reporte);
        toast.info(envio.estado === 'aceptado' ? 'Este corte ya fue aceptado por el servidor de correo.' : 'Envío registrado. Puedes consultar su estado en el historial.');
      }
    } catch (e) { toast.error(await api.mensajeError(e, 'No se pudo completar la operación. El corte guardado seguirá en el historial.')); }
    finally { setOcupado(''); setRevision((v) => v + 1); }
  };
  const boton = (tipo, r, etiqueta) => <button type="button" disabled={Boolean(ocupado)} onClick={() => accion(tipo, r)}
    aria-label={r ? `${tipo === 'descargar' ? 'Descargar PDF' : 'Enviar'} del corte ${r.id_reporte}` : undefined}>
    {ocupado === `${tipo}-${r?.id_reporte || 'nuevo'}` ? <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" />
      : tipo === 'descargar' ? <Download size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}{etiqueta}
  </button>;
  return (
    <div className={styles.page}>
      <h2 className={styles.srOnly}>Configuración y corte diario</h2>
      <div className={styles.grid}>
        {errorConfig ? <ContentState variant="error" message={errorConfig} onRetry={() => setRevisionConfig((v) => v + 1)} />
          : !config ? <ContentState variant="loading" message="Cargando configuración…" className={styles.configSkeleton} />
            : <ConfiguracionResumenDiario config={config} sucursales={sucursales.sucursales} errorSucursales={sucursales.error}
              cargandoSucursales={sucursales.cargando} recargarSucursales={sucursales.refrescar} onGuardar={guardar} onDirty={setDirty} />}
        <section className={styles.preview} aria-labelledby="titulo-corte">
          <h3 id="titulo-corte">Corte de ventas</h3>
          <p className={styles.muted}>{!config ? 'Consultando programación…' : config.automatico ? `Envío diario a las ${config.hora_envio}, hora de Guatemala.` : 'El envío automático está desactivado.'}</p>
          <label className={styles.field} htmlFor="fecha-resumen">Fecha del reporte
            <input id="fecha-resumen" name="fecha" type="date" max={hoy()} value={fecha}
              aria-invalid={!fechaValida(fecha)} aria-describedby={!fechaValida(fecha) ? 'error-fecha-resumen' : undefined}
              onChange={(e) => setParams(ruta({ fecha: e.target.value }))} />
          </label>
          {!fechaValida(fecha) ? <p id="error-fecha-resumen" className={styles.error}>Selecciona una fecha válida, hasta hoy.</p>
            : errorPreview ? <ContentState variant="error" compact message={errorPreview} onRetry={() => setRevision((v) => v + 1)} />
              : !config && errorConfig ? <p className={styles.muted}>Vuelve a cargar la configuración para consultar las ventas.</p>
                : !preview ? <ContentState variant="loading" message="Consultando ventas…" compact />
                : <div aria-busy={cargandoPreview} className={styles.figures}>
                  <span className={styles.muted}>{cargandoPreview ? 'Actualizando corte…' : `Ventas del ${fechaTexto(preview.fecha)}`}</span>
                  <strong className={styles.total}>{formatearMoneda(preview.resumen.ingresos)}</strong>
                  <dl className={styles.metrics}><div><dt>Ventas</dt><dd>{new Intl.NumberFormat('es-GT').format(preview.resumen.ventas)}</dd></div>
                    <div><dt>Utilidad bruta</dt><dd>{formatearMoneda(preview.resumen.utilidad_bruta)}</dd></div></dl>
                  <p className={styles.cutState}>{preview.estado === 'provisional' ? `Provisional · ${preview.resumen.sesiones_abiertas} sesiones abiertas` : 'Sin cajas abiertas al corte'}</p>
                  <small className={styles.muted}>Corte: {horaTexto(preview.corte)}. Utilidad antes de gastos operativos.</small>
                </div>}
          <div className={styles.delivery}><span className={styles.muted}>Destinatario guardado</span><strong>{config?.correo_destinatario || 'Aún no configurado'}</strong></div>
          <div className={styles.actions}>{boton('descargar', null, 'Descargar PDF')}{boton('enviar', null, 'Enviar ahora')}</div>
          <small className={styles.muted}>Genera un corte nuevo con la configuración guardada y lo agrega al historial.</small>
        </section>
      </div>
      <section aria-labelledby="titulo-historial" className={styles.history}>
        <div className={styles.historyHeading}><div><h3 id="titulo-historial" tabIndex={-1}>Historial de cortes</h3><p>Los datos se conservan; el PDF se genera al descargarlo.</p></div>
          <button type="button" disabled={cargandoHistorial} onClick={() => setRevision((v) => v + 1)}><RefreshCw size={16} aria-hidden="true" />Actualizar</button></div>
        {errorHistorial && <ContentState variant="error" message={errorHistorial} onRetry={() => setRevision((v) => v + 1)} />}
        {!historial ? !errorHistorial && <ContentState variant="loading" message="Cargando historial…" />
            : !historial.datos.length ? <ContentState title="Aún no hay cortes guardados" message="Descarga o envía tu primer resumen desde esta pantalla." />
              : <div className={styles.tableWrap} aria-busy={cargandoHistorial}><table id="historial-resumen" className={styles.table}>
                <caption className={styles.srOnly}>Cortes diarios y estado del envío por correo</caption>
                <thead><tr><th scope="col">Día / corte</th><th scope="col">Tipo</th><th scope="col">Correo</th><th scope="col">Acciones</th></tr></thead>
                <tbody>{historial.datos.map((r) => <tr key={r.id_reporte}>
                  <th scope="row">{fechaTexto(r.fecha)}<small>{horaTexto(r.corte)}</small></th>
                  <td><span>{r.origen === 'automatico' ? 'Automático' : 'Manual'}</span><small>{r.estado === 'provisional' ? 'Provisional' : 'Sin cajas abiertas'}</small></td>
                  <td><Link to={ruta({ detalle: r.id_reporte })} onClick={(e) => { enlaceDetalle.current = e.currentTarget; }} aria-label={`Ver envío del corte ${r.id_reporte}`}>
                    {estados[r.envio?.estado] || 'Sin envío'}</Link></td>
                  <td><div className={styles.actions}>{boton('descargar', r, 'PDF')}{!r.envio && boton('enviar', r, 'Enviar')}</div></td>
                </tr>)}</tbody>
              </table></div>}
        {historial && <Paginacion paginacion={{ pagina, limite, total: historial.paginacion.total,
          total_paginas: Math.max(1, Math.ceil(historial.paginacion.total / limite)) }} crearDestino={(p) => ruta({ pagina: p })}
          onLimiteChange={(v) => setParams(ruta({ limite: v, pagina: 1 }))} cargando={cargandoHistorial} sustantivo="cortes" controles="historial-resumen" />}
        {detalle && <section className={styles.details} aria-label={`Envío del corte ${detalle}`}>
          <div className={styles.historyHeading}><h4 id="titulo-detalle-envio" tabIndex={-1}>Correo del corte #{detalle}</h4><Link to={ruta({ detalle: null })}>Cerrar detalle</Link></div>
          {errorEnvios ? <ContentState variant="error" compact message={errorEnvios} onRetry={() => setRevision((v) => v + 1)} />
            : !envios ? <p role="status">Consultando envío…</p> : !envios.length ? <p>Este corte no tiene un envío registrado.</p>
              : envios.map((e) => <div key={e.id_envio}><strong>{estados[e.estado] || e.estado}</strong><p className={styles.break}>{e.destinatario}</p>
                <p>Intentos: {e.intentos}{e.proximo_intento_en ? ` · Próximo intento: ${horaTexto(e.proximo_intento_en)}` : ''}</p>
                {e.error && <p className={styles.error}>{e.error}</p>}
                {e.estado === 'aceptado' && <p>El servidor de correo aceptó el mensaje. Esto no confirma su entrega al buzón.</p>}
                {e.estado === 'incierto' && <p>Revisa el buzón antes de generar otro envío para evitar duplicados.</p>}
                {e.estado === 'fallido' && <p>Revisa el destinatario y la disponibilidad del correo antes de generar un nuevo corte.</p>}
              </div>)}
        </section>}
      </section>
    </div>
  );
}
