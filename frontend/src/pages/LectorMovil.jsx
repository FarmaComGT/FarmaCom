import React, { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle } from 'lucide-react';
import { solicitudMovil } from '../api/lectorMovil';
import EscanerCamaraModal from '../components/ui/EscanerCamaraModal';
import styles from './LectorMovil.module.css';

export default function LectorMovil() {
  const [enlace] = useState(() => {
    const datos = new URLSearchParams(window.location.hash.slice(1));
    return { id: datos.get('id'), clave: datos.get('clave') };
  });
  const [credencial, setCredencial] = useState(null);
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [camara, setCamara] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [pendiente, setPendiente] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [terminado, setTerminado] = useState(false);
  const envio = useRef(null);
  const ultimoAcuse = useRef(null);
  const contextoActual = useRef(null);
  const confirmadoAntes = useRef(false);
  const abrirAlConfirmar = useRef(false);
  const enCurso = useRef(false);
  const activo = useRef(true);
  const enlaceValido = /^[a-f0-9-]{36}$/i.test(enlace.id || '') && /^[a-f0-9]{64}$/.test(enlace.clave || '');
  useEffect(() => {
    activo.current = true;
    document.title = 'Lector del celular · FarmaCom';
    // No guardar la credencial en historial, almacenamiento local o logs.
    window.history.replaceState(null, '', window.location.pathname);
    return () => { activo.current = false; };
  }, []);
  useEffect(() => {
    if (!credencial) return undefined;
    const control = new AbortController();
    let timer;
    const consultar = async () => {
      try {
        const datos = await solicitudMovil(enlace.id, credencial, 'estado', { signal: control.signal });
        if (control.signal.aborted) return;
        if (contextoActual.current && contextoActual.current !== datos.contexto) {
          envio.current = null; setPendiente(null); setCodigo(''); setCamara(false);
          if (confirmadoAntes.current) abrirAlConfirmar.current = false;
          setMensaje('El destino cambió. Revisa dónde se usará la siguiente lectura.');
        }
        contextoActual.current = datos.contexto;
        confirmadoAntes.current = Boolean(datos.confirmado);
        setEstado(datos); setError('');
        ultimoAcuse.current = datos.ultimoAcuse;
        if (envio.current && datos.ultimoAcuse === envio.current.id) {
          envio.current = null; setPendiente(null); setMensaje('Lectura recibida por la computadora.');
        }
      } catch (fallo) {
        if (control.signal.aborted) return;
        setEstado(null); setCamara(false); setError(fallo.message);
        if ([401, 403, 410].includes(fallo.status)) { abrirAlConfirmar.current = false; setCredencial(null); setTerminado(true); return; }
      }
      if (!control.signal.aborted) timer = setTimeout(consultar, 1200);
    };
    void consultar();
    return () => { control.abort(); clearTimeout(timer); };
  }, [credencial, enlace.id]);
  const conectar = async () => {
    if (enCurso.current) return;
    enCurso.current = true; setOcupado(true); setError('');
    try {
      const datos = await solicitudMovil(enlace.id, enlace.clave, 'conectar', { method: 'POST' });
      if (activo.current) {
        envio.current = null; ultimoAcuse.current = null;
        contextoActual.current = datos.contexto; confirmadoAntes.current = Boolean(datos.confirmado);
        abrirAlConfirmar.current = true;
        setPendiente(null); setMensaje(''); setCodigo('');
        setCredencial(datos.token); setEstado(datos);
      }
    } catch (fallo) {
      if (activo.current) {
        setError(fallo.message);
        if ([401, 403, 410].includes(fallo.status)) setTerminado(true);
      }
    }
    finally { enCurso.current = false; if (activo.current) setOcupado(false); }
  };
  const enviar = async (valor) => {
    if (enCurso.current || !credencial || !estado?.contexto || estado.contexto !== contextoActual.current) return;
    const lectura = valor.trim();
    if (!/^[\x21-\x7E]{1,64}$/.test(lectura)) { setError('Escribe o escanea un código de hasta 64 caracteres, sin espacios.'); return; }
    enCurso.current = true; setOcupado(true); setError(''); setMensaje(''); setCamara(false);
    const datos = envio.current?.codigo === lectura && envio.current.contexto === estado.contexto ? envio.current : { id: crypto.randomUUID(), codigo: lectura, contexto: estado.contexto };
    envio.current = datos;
    try {
      await solicitudMovil(enlace.id, credencial, 'lecturas', { method: 'POST', body: datos });
      if (activo.current && contextoActual.current === datos.contexto) {
        setCodigo('');
        // El acuse puede llegar por el pulso antes que la respuesta del envío.
        if (ultimoAcuse.current === datos.id) { envio.current = null; setPendiente(null); setMensaje('Lectura recibida por la computadora.'); }
        else { setPendiente(datos.id); setMensaje('Enviado. Esperando que la computadora reciba la lectura…'); }
      }
    } catch (fallo) {
      if (activo.current && contextoActual.current === datos.contexto) {
        if (ultimoAcuse.current === datos.id) { envio.current = null; setPendiente(null); setCodigo(''); setMensaje('Lectura recibida por la computadora.'); }
        else { setError(fallo.message); setCodigo(lectura); }
      }
    }
    finally { enCurso.current = false; if (activo.current) setOcupado(false); }
  };
  const disponible = Boolean(estado?.confirmado && estado.contexto && estado.disponible && !pendiente && !ocupado);
  useEffect(() => {
    if (abrirAlConfirmar.current && disponible) {
      abrirAlConfirmar.current = false;
      setCamara(true);
    }
  }, [disponible]);
  const seguro = window.isSecureContext && window.location.protocol === 'https:';
  return <main className={styles.page}>
    <div className={styles.surface}>
      <header><span translate="no">FarmaCom</span><h1>Lector del celular</h1></header>
      {!seguro ? <p role="alert">Abre el QR desde la computadora. Si el enlace no funciona, pide ayuda al encargado para habilitar la conexión con el celular.</p> : !enlaceValido || terminado ? <p>En la computadora, pulsa «Usar celular» y abre el nuevo QR para conectar este teléfono.</p> : !credencial ? <>
        <p>Usa este teléfono para leer los códigos de los productos en tu computadora.</p>
        <button type="button" disabled={ocupado} onClick={conectar}>{ocupado ? <LoaderCircle size={18} aria-hidden="true" className={styles.spinner} /> : <Camera size={20} aria-hidden="true" />}Usar cámara</button>
      </> : !estado ? <p role="status">Recuperando la conexión con la computadora…</p> : !estado.confirmado ? <>
        <p>Compara este código y pulsa «Confirmar teléfono» en la computadora.</p>
        <output className={styles.verificacion}>{estado?.verificacion}</output>
        <p role="status">La cámara se abrirá al confirmar. Permite su uso cuando el teléfono lo solicite.</p>
      </> : <>
        <p role="status">Destino: {({ ventas: 'Punto de venta', producto: 'Registro de producto', pausa: 'En pausa' })[estado.destino] || 'En pausa'}</p>
        <p role="status">{disponible ? 'Listo para escanear.' : 'Espera a que la computadora esté disponible.'}</p>
        <button type="button" disabled={!disponible} onClick={() => setCamara(true)}><Camera size={20} aria-hidden="true" />Escanear código</button>
        <details className={styles.alternative}>
          <summary>Escribir código</summary>
          <form noValidate onSubmit={(evento) => { evento.preventDefault(); void enviar(codigo); }}>
          <label htmlFor="codigo-movil">Código del producto</label>
          <input id="codigo-movil" name="codigo" type="text" maxLength={64} autoComplete="off" spellCheck={false} value={codigo} disabled={!disponible} placeholder="Escribe o escanea el código…" onChange={(evento) => setCodigo(evento.target.value)} />
          <button type="submit" disabled={!disponible}>{ocupado && <LoaderCircle size={18} aria-hidden="true" className={styles.spinner} />}Enviar código</button>
          </form>
        </details>
      </>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {mensaje && <p role="status">{mensaje}</p>}
      {credencial && <button className={styles.secondary} type="button" onClick={async () => {
        abrirAlConfirmar.current = false;
        setCamara(false);
        try { await solicitudMovil(enlace.id, credencial, '', { method: 'DELETE' }); } catch { /* La conexión también caduca en el servidor. */ }
        if (activo.current) { setCredencial(null); setEstado(null); setTerminado(true); setError(''); setMensaje('Celular desconectado.'); }
      }}>Desconectar</button>}
    </div>
    {camara && <EscanerCamaraModal onClose={() => setCamara(false)} onCodigo={enviar} />}
  </main>;
}
