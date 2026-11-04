import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from 'lucide-react';
import styles from './ToastViewport.module.css';

const VARIANTES = {
  success: { titulo: 'Éxito', Icono: CircleCheck },
  error: { titulo: 'Error', Icono: CircleAlert },
  warning: { titulo: 'Advertencia', Icono: TriangleAlert },
  info: { titulo: 'Información', Icono: Info },
};

function Toast({ mensaje, cerrar, devolverFoco }) {
  const { titulo, Icono } = VARIANTES[mensaje.tipo];
  const [hover, setHover] = useState(false);
  const [foco, setFoco] = useState(false);
  const [oculto, setOculto] = useState(() => document.hidden);
  const restante = useRef(mensaje.duracion);
  const pausado = hover || foco || oculto;

  useEffect(() => {
    const actualizar = () => setOculto(document.hidden);
    document.addEventListener('visibilitychange', actualizar);
    return () => document.removeEventListener('visibilitychange', actualizar);
  }, []);

  useEffect(() => {
    if (!mensaje.duracion || pausado) return undefined;
    const inicio = performance.now();
    const temporizador = setTimeout(() => cerrar(mensaje.id), restante.current);
    return () => {
      clearTimeout(temporizador);
      restante.current = Math.max(0, restante.current - (performance.now() - inicio));
    };
  }, [mensaje.id, mensaje.duracion, cerrar, pausado]);

  return (
    <li className={`${styles.toast} ${styles[mensaje.tipo]}`}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      onFocus={() => setFoco(true)}
      onBlur={(evento) => { if (!evento.currentTarget.contains(evento.relatedTarget)) setFoco(false); }}>
      <Icono className={styles.icon} size={20} strokeWidth={1.75} aria-hidden="true" />
      <div className={styles.content} role="status" aria-live="polite" aria-atomic="true">
        <strong>{titulo}</strong>
        <p>{mensaje.texto}</p>
      </div>
      <button type="button" className={styles.close} aria-label={`Cerrar notificación: ${mensaje.texto}`}
        onClick={(evento) => {
          const teniaFoco = document.activeElement === evento.currentTarget;
          cerrar(mensaje.id);
          if (teniaFoco) devolverFoco();
        }}><X size={18} aria-hidden="true" /></button>
      {mensaje.duracion > 0 && (
        <div className={styles.progress} aria-hidden="true" data-toast-timer="">
          <span className={styles.progressFill} style={{
            animationDuration: `${mensaje.duracion}ms`,
            animationPlayState: pausado ? 'paused' : 'running',
          }} />
        </div>
      )}
    </li>
  );
}

export default function ToastViewport({ mensajes, cerrar }) {
  const region = useRef(null);
  const focoAnterior = useRef(null);
  const devolverFoco = () => {
    if (focoAnterior.current?.isConnected && !focoAnterior.current.closest('[inert]')) focoAnterior.current.focus();
  };
  useEffect(() => {
    const atajo = (evento) => {
      if (evento.key !== 'F8' || !region.current?.querySelector('button')) return;
      evento.preventDefault();
      if (region.current.contains(document.activeElement)) return;
      focoAnterior.current = document.activeElement;
      region.current.querySelector('button').focus();
    };
    document.addEventListener('keydown', atajo);
    return () => document.removeEventListener('keydown', atajo);
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <section ref={region} className={styles.viewport} aria-label="Notificaciones" aria-keyshortcuts="F8"
      onFocusCapture={(evento) => {
        if (evento.relatedTarget && !evento.currentTarget.contains(evento.relatedTarget)) focoAnterior.current = evento.relatedTarget;
      }}
      onKeyDownCapture={(evento) => {
        if (evento.key !== 'Escape') return;
        evento.preventDefault();
        evento.stopPropagation();
        devolverFoco();
      }}>
      <ol className={styles.list}>
        {mensajes.map((mensaje) => <Toast key={mensaje.id} mensaje={mensaje} cerrar={cerrar} devolverFoco={devolverFoco} />)}
      </ol>
    </section>, document.body,
  );
}
