import React from 'react';
import { LoaderCircle } from 'lucide-react';
import useAvisoCambiosResumen from '../../hooks/useAvisoCambiosResumen';
import styles from '../../styles/ResumenDiario.module.css';

export const camposConfiguracion = (config) => ({
  correo_destinatario: config.correo_destinatario || '', hora_envio: config.hora_envio || '20:00',
  automatico: Boolean(config.automatico), todas_sucursales: Boolean(config.todas_sucursales),
  sucursales: [...config.sucursales || []].map(Number).sort((a, b) => a - b),
});

export default function ConfiguracionResumenDiario({ config, sucursales, errorSucursales,
  cargandoSucursales, recargarSucursales, onGuardar, onDirty }) {
  const [datos, setDatos] = React.useState(() => camposConfiguracion(config));
  const [errores, setErrores] = React.useState({});
  const [guardando, setGuardando] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState('');
  const [paginaSucursales, setPaginaSucursales] = React.useState(1);
  const filtradas = sucursales.filter((s) => s.nombre_sucursal.toLocaleLowerCase('es-GT').includes(busqueda.trim().toLocaleLowerCase('es-GT')));
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / 25));
  const paginaActual = Math.min(paginaSucursales, totalPaginas);
  const form = React.useRef(null);
  React.useEffect(() => { setDatos(camposConfiguracion(config)); setErrores({}); }, [config]);
  const dirty = JSON.stringify(datos) !== JSON.stringify(camposConfiguracion(config));
  useAvisoCambiosResumen(dirty);
  React.useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  const cambiar = (campo, valor) => setDatos((prev) => ({ ...prev, [campo]: valor }));
  const guardar = async (evento) => {
    evento.preventDefault();
    const erroresNuevos = {};
    const correo = datos.correo_destinatario.trim();
    if ((correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) || (datos.automatico && !correo)) {
      erroresNuevos.correo_destinatario = 'Ingresa un correo válido para recibir el resumen.';
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(datos.hora_envio)) erroresNuevos.hora_envio = 'Selecciona una hora válida.';
    if (!datos.todas_sucursales && (!datos.sucursales.length || datos.sucursales.length > 100)) {
      erroresNuevos.sucursales = 'Selecciona entre 1 y 100 sucursales.';
    }
    setErrores(erroresNuevos);
    const primero = Object.keys(erroresNuevos)[0];
    if (primero) { (form.current.querySelector(`[name="${primero}"]`) || form.current.querySelector('[name="todas_sucursales"]'))?.focus(); return; }
    setGuardando(true);
    try {
      await onGuardar({ ...datos, correo_destinatario: correo, sucursales: datos.todas_sucursales ? [] : datos.sucursales });
    } catch (error) { setErrores({ general: error.message }); }
    finally { setGuardando(false); }
  };
  return (
    <form ref={form} onSubmit={guardar} noValidate className={styles.panel} aria-labelledby="titulo-configuracion">
      <h3 id="titulo-configuracion">Correo y programación</h3>
      <p className={styles.muted}>Decide dónde, cuándo y qué sucursales incluir.</p>
      <fieldset disabled={guardando} className={styles.fields}>
        <label className={styles.field} htmlFor="resumen-correo">Correo destinatario
          <input id="resumen-correo" name="correo_destinatario" type="email" inputMode="email" autoComplete="email" spellCheck={false}
            maxLength={254} value={datos.correo_destinatario} onChange={(e) => cambiar('correo_destinatario', e.target.value)}
            placeholder="Ej. propietario@correo.com…" aria-invalid={Boolean(errores.correo_destinatario)}
            aria-describedby={errores.correo_destinatario ? 'error-correo' : undefined} />
          {errores.correo_destinatario && <span id="error-correo" className={styles.error}>{errores.correo_destinatario}</span>}
        </label>
        <label className={styles.check}><input type="checkbox" name="automatico" checked={datos.automatico}
          onChange={(e) => cambiar('automatico', e.target.checked)} />
          <span>Enviar todos los días<small>Un resumen automático por día, incluso si no hubo ventas.</small></span>
        </label>
        <label className={styles.field} htmlFor="resumen-hora">Hora de envío
          <div className={styles.time}><input id="resumen-hora" type="time" name="hora_envio" value={datos.hora_envio}
            onChange={(e) => cambiar('hora_envio', e.target.value)} aria-invalid={Boolean(errores.hora_envio)}
            aria-describedby="ayuda-hora error-hora" /><span>Hora de Guatemala</span></div>
          <small id="ayuda-hora">Los cambios aplican al próximo horario disponible.</small>
          <span id="error-hora" className={styles.error}>{errores.hora_envio}</span>
        </label>
        <fieldset className={styles.scope}>
          <legend>Sucursales incluidas</legend>
          <label className={styles.check}><input type="checkbox" name="todas_sucursales" checked={datos.todas_sucursales}
            onChange={(e) => cambiar('todas_sucursales', e.target.checked)} />Todas las sucursales</label>
          {!datos.todas_sucursales && <div className={styles.branches} aria-label="Seleccionar sucursales">
            <label className={styles.field}>Buscar sucursal<input type="search" name="buscar_sucursal" autoComplete="off"
              value={busqueda} placeholder="Ej. Centro…" onChange={(e) => { setBusqueda(e.target.value); setPaginaSucursales(1); }} /></label>
            <p className={styles.muted}>{datos.sucursales.length} seleccionadas</p>
            {cargandoSucursales && <p role="status">Cargando sucursales…</p>}
            {errorSucursales && <div role="alert"><p>{errorSucursales}</p><button type="button" onClick={recargarSucursales}>Reintentar</button></div>}
            {!cargandoSucursales && !errorSucursales && !sucursales.length && <p>No hay sucursales. Selecciona todas para incluir las que se creen después.</p>}
            {!cargandoSucursales && !errorSucursales && sucursales.length > 0 && !filtradas.length && <p>No hay coincidencias. Prueba otro nombre.</p>}
            {filtradas.slice((paginaActual - 1) * 25, paginaActual * 25).map((s) => <label key={s.id_sucursal} className={styles.check}>
              <input type="checkbox" name="sucursales" value={s.id_sucursal} checked={datos.sucursales.includes(Number(s.id_sucursal))}
                aria-invalid={Boolean(errores.sucursales)} aria-describedby={errores.sucursales ? 'error-sucursales' : undefined}
                onChange={(e) => cambiar('sucursales', e.target.checked
                  ? [...datos.sucursales, Number(s.id_sucursal)].sort((a, b) => a - b)
                  : datos.sucursales.filter((id) => id !== Number(s.id_sucursal)))} />{s.nombre_sucursal}
            </label>)}
            {totalPaginas > 1 && <div className={styles.actions}>
              <button type="button" disabled={paginaActual === 1} onClick={() => setPaginaSucursales(paginaActual - 1)}>Anteriores</button>
              <span>{paginaActual} / {totalPaginas}</span>
              <button type="button" disabled={paginaActual === totalPaginas} onClick={() => setPaginaSucursales(paginaActual + 1)}>Más sucursales</button>
            </div>}
          </div>}
          {errores.sucursales && <p id="error-sucursales" className={styles.error}>{errores.sucursales}</p>}
        </fieldset>
      </fieldset>
      <div aria-live="polite">{errores.general && <p className={styles.error}>{errores.general}</p>}</div>
      <div className={styles.formFooter}>
        <span className={styles.muted}>{dirty ? 'Cambios sin guardar' : 'Configuración guardada'}</span>
        <div className={styles.actions}>
          {dirty && <button type="button" disabled={guardando} onClick={() => { setDatos(camposConfiguracion(config)); setErrores({}); }}>Descartar</button>}
          <button className={styles.primary} disabled={guardando} type="submit">
            {guardando && <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" />}Guardar configuración
          </button>
        </div>
      </div>
    </form>
  );
}
