import React, { useEffect, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { Modal } from './Modal';
import styles from './LectorMovil.module.css';

const nombresDestino = { ventas: 'Punto de venta', producto: 'Registro de producto', pausa: 'En pausa' };

export default function LectorMovilDialog({ abierto, sesion, cargando, error, abrir, cerrar, desconectar, confirmar, destino }) {
  const [aviso, setAviso] = useState('');
  const [mostrarEnlace, setMostrarEnlace] = useState(false);
  useEffect(() => { setAviso(''); setMostrarEnlace(false); }, [abierto]);
  return (
    <Modal isOpen={abierto} size="sm" labelledBy="titulo-vincular-lector" onClose={cerrar} limitarAltura panelClassName={styles.panel}>
      <header className={styles.header}><h2 id="titulo-vincular-lector">Lector del celular</h2><button type="button" aria-label="Cerrar vinculación" onClick={cerrar}><X size={20} aria-hidden="true" /></button></header>
      <div className={styles.content}>
        {cargando && !sesion && <p role="status"><LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />Preparando vinculación…</p>}
        {sesion && <>
          {!sesion.conectado && <>
            <p>Abre la cámara de tu teléfono, apunta al QR y toca el enlace. Después pulsa «Usar cámara».</p>
            <img className={styles.qr} src={sesion.qr} width={288} height={288} alt="QR de vinculación temporal del lector" />
            <p>El QR está disponible durante dos minutos.</p>
            <button type="button" className={styles.disclosure} aria-expanded={mostrarEnlace} aria-controls="alternativa-enlace-lector" onClick={() => setMostrarEnlace(!mostrarEnlace)}>No puedo abrir el QR</button>
            {mostrarEnlace && <div id="alternativa-enlace-lector" className={styles.alternative}>
            <button className={styles.button} type="button" onClick={async () => {
              try { await navigator.clipboard.writeText(sesion.enlace); setAviso('Enlace copiado. Ábrelo en tu teléfono.'); }
              catch { setAviso('No se pudo copiar. Usa el QR o copia el enlace del campo.'); }
            }}>Copiar enlace</button>
            <label htmlFor="enlace-lector">Enlace para abrir manualmente</label>
            <input id="enlace-lector" type="text" readOnly value={sesion.enlace} onFocus={(evento) => evento.target.select()} />
            </div>}
          </>}
          {sesion.conectado && !sesion.confirmado && <>
            <p>Comprueba que tu teléfono muestra este mismo código antes de confirmar.</p>
            <output className={styles.verificacion}>{sesion.verificacion}</output>
            <button className={`${styles.button} ${styles.primary}`} type="button" disabled={cargando} onClick={confirmar}>{cargando && <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />}Confirmar teléfono</button>
          </>}
          {sesion.confirmado && <p>El teléfono está vinculado a tu sesión de FarmaCom. Destino actual: {nombresDestino[destino]}.</p>}
          {sesion.confirmado && <p>Se desconecta tras {sesion.inactividadMinutos} minutos sin lecturas. Puedes usarlo hasta las {new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit' }).format(new Date(sesion.limiteJornada))}.</p>}
          <button className={styles.button} type="button" onClick={desconectar}>Desconectar celular</button>
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {aviso && <p role="status">{aviso}</p>}
        {!sesion && !cargando && error && <button className={styles.button} type="button" onClick={abrir}>Intentar de nuevo</button>}
      </div>
    </Modal>
  );
}
