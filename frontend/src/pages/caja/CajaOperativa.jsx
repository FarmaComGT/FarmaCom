import { useToast } from '../../context/ToastContext.jsx';
import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  LoaderCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useCaja from '../../hooks/useCaja';

import CajaDialog from '../../components/caja/CajaDialog';
import ui from '../../components/caja/CajaUI.module.css';
import styles from './CajaOperativa.module.css';
import useAvisoCambiosCaja, { confirmarDescartarCambiosCaja } from '../../hooks/useAvisoCambiosCaja';

const FORMULARIO_INICIAL = {
  turno: '',
  fondo_inicial: '',
};

const MOVIMIENTO_INICIAL = {
  tipo: 'entrada',
  monto: '',
  motivo: '',
};

const CIERRE_INICIAL = {
  efectivo_contado: '',
  observaciones: '',
};

const esMontoValido = (valor) => (
  /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(valor)
  && Number(valor) <= 9999999999.99
);

const formatearQuetzales = (monto) => new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
}).format(Number(monto || 0));

const obtenerResultadoCierre = (cierre) => {
  if (cierre.resultado === 'sobrante') {
    return {
      titulo: 'Sobrante de efectivo',
      detalle: `Se registró un sobrante de ${formatearQuetzales(
        Math.abs(Number(cierre.diferencia_efectivo)),
      )}.`,
    };
  }

  if (cierre.resultado === 'faltante') {
    return {
      titulo: 'Faltante de efectivo',
      detalle: `Se registró un faltante de ${formatearQuetzales(
        Math.abs(Number(cierre.diferencia_efectivo)),
      )}.`,
    };
  }

  return {
    titulo: 'Caja cuadrada',
    detalle: 'El efectivo contado coincide con el efectivo esperado.',
  };
};

export default function CajaOperativa() {
  const toast = useToast();
  const { sucursalActivaId, usuario } = useAuth();
  const {
    cajas,
    cajaSeleccionada,
    idCajaSeleccionada,
    sesionActual,
    cargandoCajas,
    cargandoSesion,
    procesando,
    error,
    seleccionarCaja,
    abrir,
    registrar,
    cerrar,
    limpiarError,
  } = useCaja(sucursalActivaId);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [movimiento, setMovimiento] = useState(MOVIMIENTO_INICIAL);
  const [datosCierre, setDatosCierre] = useState(CIERRE_INICIAL);
  const [ultimoCierre, setUltimoCierre] = useState(null);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const [campoError, setCampoError] = useState(null);
  const pagosPOSAbiertos = sesionActual?.pagos_pos_abiertos || [];
  const hayPagosPOSAbiertos = pagosPOSAbiertos.length > 0;
  const hayCambios = Boolean(formulario.turno || formulario.fondo_inicial || movimiento.monto || movimiento.motivo || datosCierre.efectivo_contado || datosCierre.observaciones);
  useAvisoCambiosCaja(hayCambios);
  useEffect(() => { document.title = 'Operación de caja · FarmaCom'; }, []);
  useEffect(() => { if (!errorFormulario) setCampoError(null); }, [errorFormulario]);
  useEffect(() => {
    if (ultimoCierre) document.getElementById('resultado-cierre')?.focus();
  }, [ultimoCierre]);
  const invalidar = (campo, mensaje) => { setCampoError(campo); setErrorFormulario(mensaje); document.getElementById(campo)?.focus(); };

  const cambiarCaja = (evento) => {
    if (hayCambios && !confirmarDescartarCambiosCaja()) return;
    seleccionarCaja(evento.target.value || null);
    setFormulario(FORMULARIO_INICIAL);
    setMovimiento(MOVIMIENTO_INICIAL);
    setDatosCierre(CIERRE_INICIAL);
    setUltimoCierre(null);
    setConfirmandoCierre(false);
    setErrorFormulario(null);

    limpiarError();
  };

  const actualizarCampo = (evento) => {
    setFormulario((actual) => ({
      ...actual,
      [evento.target.name]: evento.target.value,
    }));
    setErrorFormulario(null);

  };

  const abrirTurno = async (evento) => {
    evento.preventDefault();
    const fondoInicial = formulario.fondo_inicial.trim();

    if (!formulario.turno) {
      invalidar('turno-caja', 'Selecciona el turno que deseas abrir.');
      return;
    }

    if (!esMontoValido(fondoInicial)) {
      invalidar('fondo-inicial', 'Ingresa un fondo inicial válido con máximo dos decimales.');
      return;
    }

    try {
      setErrorFormulario(null);
      await abrir({
        turno: formulario.turno,
        fondo_inicial: fondoInicial,
      });
      setUltimoCierre(null);
      setFormulario(FORMULARIO_INICIAL);
      toast.success('La sesión de caja se abrió correctamente.');
    } catch (errorOperacion) {
      toast.error(errorOperacion.message);
      limpiarError();
      // El fallo de operación ya se comunica con el toast.
    }
  };

  const actualizarMovimiento = (evento) => {
    setMovimiento((actual) => ({
      ...actual,
      [evento.target.name]: evento.target.value,
    }));
    setErrorFormulario(null);

  };

  const guardarMovimiento = async (evento) => {
    evento.preventDefault();
    const monto = movimiento.monto.trim();
    const motivo = movimiento.motivo.trim();

    if (!esMontoValido(monto) || Number(monto) <= 0) {
      invalidar('monto-movimiento', 'Ingresa un monto mayor que cero con máximo dos decimales.');
      return;
    }

    if (!motivo) {
      invalidar('motivo-movimiento', 'Ingresa el motivo del movimiento.');
      return;
    }

    try {
      setErrorFormulario(null);
      await registrar({ tipo: movimiento.tipo, monto, motivo });
      setMovimiento(MOVIMIENTO_INICIAL);
      toast.success(
        movimiento.tipo === 'entrada'
          ? 'La entrada se registró correctamente.'
          : 'La salida se registró correctamente.',
      );
    } catch (errorOperacion) {
      toast.error(errorOperacion.message);
      limpiarError();
      // El fallo de operación ya se comunica con el toast.
    }
  };

  const actualizarCierre = (evento) => {
    setDatosCierre((actual) => ({
      ...actual,
      [evento.target.name]: evento.target.value,
    }));
    setErrorFormulario(null);

  };

  const solicitarCierre = (evento) => {
    evento.preventDefault();
    const efectivoContado = datosCierre.efectivo_contado.trim();
    const observaciones = datosCierre.observaciones.trim();

    if (!esMontoValido(efectivoContado)) {
      invalidar('efectivo-contado', 'Ingresa un efectivo contado válido con máximo dos decimales.');
      return;
    }

    if (!observaciones) {
      invalidar('observaciones-cierre', 'Ingresa una nota de cierre antes de continuar.');
      return;
    }

    setErrorFormulario(null);
    setConfirmandoCierre(true);
  };

  const confirmarCierre = async () => {
    const efectivoContado = datosCierre.efectivo_contado.trim();
    const observaciones = datosCierre.observaciones.trim();

    try {
      setErrorFormulario(null);
      const cierre = await cerrar({
        efectivo_contado: efectivoContado,
        observaciones,
      });
      setUltimoCierre(cierre);
      setDatosCierre(CIERRE_INICIAL);
      setConfirmandoCierre(false);
      toast.success('La sesión de caja se cerró correctamente.');
    } catch (errorOperacion) {
      toast.error(errorOperacion.message);
      limpiarError();
      setConfirmandoCierre(false);
      // El hook expone el mensaje enviado por el backend.
    }
  };

  return (
    <div className={ui.page}>
      <header className={ui.heading}>
        <div><h1>Operación de caja</h1><p>Apertura, movimientos y cierre del turno.</p></div>
      </header>

      {!sucursalActivaId && <div className={ui.notice}><AlertCircle size={16} aria-hidden="true" />Debes tener una sucursal activa para operar una caja.</div>}
      {error && <div role="alert" className={`${ui.notice} ${ui.error}`}>{error}</div>}

      <section className={styles.selector} aria-labelledby="seleccionar-caja-titulo">
        <div><h2 id="seleccionar-caja-titulo" className={ui.sectionHeading}>Seleccionar caja</h2><p className={ui.description}>Trabaja con las cajas de tu sucursal activa.</p></div>
        <div className={ui.field}>
          <label htmlFor="selector-caja">Caja disponible</label>
          <select id="selector-caja" name="id_caja" value={idCajaSeleccionada || ''} onChange={cambiarCaja} disabled={procesando || !sucursalActivaId || cargandoCajas || cajas.length === 0} className={ui.input}>
            <option value="">{cargandoCajas ? 'Cargando cajas…' : 'Selecciona una caja'}</option>
            {cajas.map((caja) => <option key={caja.id_caja} value={caja.id_caja}>{caja.nombre}{caja.id_sesion_abierta ? ' — turno abierto' : ''}</option>)}
          </select>
        </div>
      </section>
      {!cargandoCajas && sucursalActivaId && cajas.length === 0 && !error && <p className={ui.empty}>No hay cajas activas disponibles en esta sucursal.</p>}
      {!idCajaSeleccionada && cajas.length > 0 && <div className={ui.empty}><p>Selecciona una caja para iniciar o continuar tu turno.</p></div>}
      {idCajaSeleccionada && cargandoSesion && <div role="status" className={ui.loading}>Consultando la sesión actual…<span className={ui.skeleton} /><span className={ui.skeleton} /></div>}

      {ultimoCierre && (() => {
        const resultado = obtenerResultadoCierre(ultimoCierre);
        return <section className={ui.panel}>
          <h2 id="resultado-cierre" tabIndex={-1} className={ui.sectionHeading}>{resultado.titulo}</h2><p className={ui.description}>{resultado.detalle}</p>
          <div className={styles.closureSummary}>
            <div><span>Esperado:</span><strong>{formatearQuetzales(ultimoCierre.efectivo_esperado)}</strong></div>
            <div><span>Contado:</span><strong>{formatearQuetzales(ultimoCierre.efectivo_contado)}</strong></div>
          </div>
        </section>;
      })()}

      <CajaDialog abierta={confirmandoCierre} labelledBy="titulo-confirmar-cierre" onClose={() => !procesando && setConfirmandoCierre(false)} ocupada={procesando}>
        <h2 id="titulo-confirmar-cierre" className={ui.sectionHeading}>Confirmar cierre de turno</h2>
        <p className={ui.description}>Confirma que terminaste el conteo físico. Al cerrar, el sistema calculará la diferencia y esta acción no podrá deshacerse.</p>
        <div className={styles.confirmAmount}><span>Efectivo contado</span><strong>{formatearQuetzales(datosCierre.efectivo_contado)}</strong></div>
        <div className={ui.actions}>
          <button type="button" className={ui.button} onClick={() => setConfirmandoCierre(false)} disabled={procesando}>Volver a contar</button>
          <button type="button" className={`${ui.button} ${ui.primary}`} onClick={confirmarCierre} disabled={procesando}>{procesando && <LoaderCircle size={16} className={ui.spinner} aria-hidden="true" />}Confirmar cierre</button>
        </div>
      </CajaDialog>

      {cajaSeleccionada && !cargandoSesion && sesionActual && <>
        <section className={styles.session}>
          <div><h2 className={ui.sectionHeading}>Turno abierto en {cajaSeleccionada.nombre}</h2><p>Turno {sesionActual.turno}</p></div>
          <span><Clock3 size={16} aria-hidden="true" />En curso</span>
        </section>
        {hayPagosPOSAbiertos && (
          <section className={styles.paymentBlockers} aria-labelledby="pagos-pos-abiertos-titulo">
            <div>
              <h2 id="pagos-pos-abiertos-titulo">Operaciones POS por resolver</h2>
              <p>
                {pagosPOSAbiertos.length === 1 ? 'Esta operación impide' : 'Estas operaciones impiden'} cerrar el turno.
              </p>
            </div>
            <ul>
              {pagosPOSAbiertos.map((pago) => (
                <li key={pago.external_id}>
                  <div>
                    <strong>{pago.estado === 'incidencia' ? 'Cobrado, venta pendiente' : 'Esperando respuesta del POS'}</strong>
                    <span>{pago.referencia_pago || pago.external_id}</span>
                  </div>
                  <span>{formatearQuetzales(pago.total)} · {pago.estado}</span>
                </li>
              ))}
            </ul>
            <a href="/pos" className={styles.paymentBlockersLink}>Continuar seguimiento en punto de venta</a>
          </section>
        )}
        <div className={styles.workspace}>
          <section className={ui.panel}>
            <h2 className={ui.sectionHeading}>Registrar movimiento</h2><p className={ui.description}>Entradas adicionales y retiros de efectivo del turno.</p>
            <form onSubmit={guardarMovimiento} className={ui.form} noValidate>
              <fieldset><legend className={ui.legend}>Tipo de movimiento</legend><div className={styles.typeOptions}>
                <label className={styles.typeOption}><input type="radio" name="tipo" value="entrada" checked={movimiento.tipo === 'entrada'} onChange={actualizarMovimiento} disabled={procesando} /><ArrowDownToLine size={16} aria-hidden="true" />Entrada</label>
                <label className={styles.typeOption}><input type="radio" name="tipo" value="salida" checked={movimiento.tipo === 'salida'} onChange={actualizarMovimiento} disabled={procesando} /><ArrowUpFromLine size={16} aria-hidden="true" />Salida</label>
              </div></fieldset>
              <div className={ui.field}><label htmlFor="monto-movimiento">Monto</label><div className={ui.moneyInput}><span aria-hidden="true">Q</span><input id="monto-movimiento" name="monto" type="text" inputMode="decimal" autoComplete="off" value={movimiento.monto} onChange={actualizarMovimiento} disabled={procesando} placeholder="0.00…" className={ui.input} aria-invalid={campoError === 'monto-movimiento'} aria-describedby={campoError === 'monto-movimiento' ? 'error-movimiento' : undefined} /></div></div>
              <div className={ui.field}><label htmlFor="motivo-movimiento">Motivo</label><input id="motivo-movimiento" name="motivo" type="text" autoComplete="off" value={movimiento.motivo} onChange={actualizarMovimiento} disabled={procesando} maxLength={500} placeholder="Ej.: retiro para depósito…" className={ui.input} aria-invalid={campoError === 'motivo-movimiento'} aria-describedby={campoError === 'motivo-movimiento' ? 'error-movimiento' : undefined} /></div>
              {errorFormulario && ['monto-movimiento', 'motivo-movimiento'].includes(campoError) && <p id="error-movimiento" role="alert" className={ui.fieldError}>{errorFormulario}</p>}
              <div className={ui.actions}><button type="submit" disabled={procesando} className={`${ui.button} ${ui.primary}`}>{procesando && <LoaderCircle size={16} className={ui.spinner} aria-hidden="true" />}Registrar movimiento</button></div>
            </form>
          </section>
          <section className={ui.panel}>
            <h2 className={ui.sectionHeading}>Cerrar turno</h2><p className={ui.description}>Registra el conteo físico y una nota de cierre.</p>
            <form onSubmit={solicitarCierre} className={ui.form} noValidate onKeyDown={(evento) => { if (evento.target.tagName === 'TEXTAREA' && evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) { evento.preventDefault(); evento.currentTarget.requestSubmit(); } }}>
              <div className={ui.field}><label htmlFor="efectivo-contado">Efectivo contado</label><div className={ui.moneyInput}><span aria-hidden="true">Q</span><input id="efectivo-contado" name="efectivo_contado" type="text" inputMode="decimal" autoComplete="off" value={datosCierre.efectivo_contado} onChange={actualizarCierre} disabled={procesando} placeholder="0.00…" className={ui.input} aria-invalid={campoError === 'efectivo-contado'} aria-describedby={campoError === 'efectivo-contado' ? 'error-cierre' : undefined} /></div></div>
              <div className={ui.field}><label htmlFor="observaciones-cierre">Nota de cierre <span className={ui.muted}>(requerida)</span></label><textarea id="observaciones-cierre" name="observaciones" value={datosCierre.observaciones} onChange={actualizarCierre} disabled={procesando} maxLength={500} rows={3} placeholder="Describe el conteo o cualquier incidencia…" className={ui.input} aria-invalid={campoError === 'observaciones-cierre'} aria-describedby={campoError === 'observaciones-cierre' ? 'error-cierre' : undefined} /></div>
              {errorFormulario && ['efectivo-contado', 'observaciones-cierre'].includes(campoError) && <p id="error-cierre" role="alert" className={ui.fieldError}>{errorFormulario}</p>}
              <div className={ui.actions}><button type="submit" disabled={procesando || hayPagosPOSAbiertos} className={ui.button}>{procesando && <LoaderCircle size={16} className={ui.spinner} aria-hidden="true" />}Cerrar turno</button></div>
            </form>
          </section>
        </div>
      </>}

      {cajaSeleccionada && !cargandoSesion && !sesionActual && <section className={`${ui.panel} ${styles.opening}`}>
        <h2 className={ui.sectionHeading}>Abrir turno en {cajaSeleccionada.nombre}</h2><p className={ui.description}>Registra el turno y el efectivo disponible al iniciar.</p>
        <form onSubmit={abrirTurno} className={ui.form} noValidate>
          <div className={ui.fields}>
            <div className={ui.field}><label htmlFor="turno-caja">Turno</label><select id="turno-caja" name="turno" value={formulario.turno} onChange={actualizarCampo} disabled={procesando} className={ui.input} aria-invalid={campoError === 'turno-caja'} aria-describedby={campoError === 'turno-caja' ? 'error-apertura' : undefined}><option value="">Selecciona un turno</option><option value="mañana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option></select></div>
            <div className={ui.field}><label htmlFor="fondo-inicial">Fondo inicial</label><div className={ui.moneyInput}><span aria-hidden="true">Q</span><input id="fondo-inicial" name="fondo_inicial" type="text" inputMode="decimal" autoComplete="off" value={formulario.fondo_inicial} onChange={actualizarCampo} disabled={procesando} placeholder="0.00…" className={ui.input} aria-invalid={campoError === 'fondo-inicial'} aria-describedby={campoError === 'fondo-inicial' ? 'error-apertura' : undefined} /></div></div>
          </div>
          {errorFormulario && ['turno-caja', 'fondo-inicial'].includes(campoError) && <p id="error-apertura" role="alert" className={ui.fieldError}>{errorFormulario}</p>}
          <div className={ui.actions}><button type="submit" disabled={procesando} className={`${ui.button} ${ui.primary}`}>{procesando && <LoaderCircle size={16} className={ui.spinner} aria-hidden="true" />}Abrir turno</button></div>
        </form>
      </section>}
    </div>
  );
}
