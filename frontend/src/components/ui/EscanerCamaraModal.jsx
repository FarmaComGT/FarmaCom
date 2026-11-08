import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { Modal } from './Modal';
import { iniciarEscanerCamara, mensajeErrorCamara } from '../../utils/escanerCamara';
import styles from './EscanerCamaraModal.module.css';

export default function EscanerCamaraModal({ onClose, onCodigo }) {
  const visor = useRef(null);
  const recibirCodigo = useRef(onCodigo);
  recibirCodigo.current = onCodigo;
  const [deviceId, setDeviceId] = useState('');
  const [camaras, setCamaras] = useState([]);
  const [estado, setEstado] = useState('iniciando');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [controles, setControles] = useState({});
  const [zoom, setZoom] = useState(1);
  const [errorZoom, setErrorZoom] = useState('');
  const revisionZoom = useRef(0);

  useEffect(() => {
    let vigente = true;
    const target = visor.current;
    setEstado('iniciando');
    setError('');
    setControles({});
    setErrorZoom('');
    revisionZoom.current += 1;
    const detener = iniciarEscanerCamara({
      target, deviceId,
      onCodigo: (codigo) => { if (vigente) recibirCodigo.current(codigo); },
      onListo: (dispositivos, opciones = {}) => {
        if (!vigente) return;
        setCamaras(dispositivos); setControles(opciones); setZoom(opciones.zoom?.value ?? 1); setEstado('leyendo');
      },
      onError: (fallo) => {
        if (!vigente) return;
        setEstado('error');
        setError(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia
          ? 'Abre FarmaCom con HTTPS o localhost para usar la cámara.' : mensajeErrorCamara(fallo));
      },
    });
    return () => { vigente = false; revisionZoom.current += 1; detener(); };
  }, [deviceId, intento]);

  return (
    <Modal isOpen size="md" labelledBy="titulo-escaner-camara" describedBy="ayuda-escaner-camara" onClose={onClose} limitarAltura panelClassName={styles.panel}>
      <header className={styles.header}>
        <h2 id="titulo-escaner-camara">Escanear código de barras</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar cámara"><X size={20} aria-hidden="true" /></button>
      </header>
      <div className={styles.content}>
        <p id="ayuda-escaner-camara">Centra las barras sobre la guía, con el código completo y enfocado.</p>
        <div className={styles.marco} style={{ aspectRatio: controles.aspectRatio || '4 / 3' }}>
          <div ref={visor} className={styles.visor} aria-label="Vista previa de la cámara" />
          <div className={styles.guia} aria-hidden="true" />
        </div>
        <p className={styles.status} aria-live="polite">
          {estado === 'iniciando' && <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />}
          {estado === 'iniciando' ? 'Iniciando cámara…' : estado === 'leyendo' ? 'Buscando un código…' : 'Cámara no disponible'}
        </p>
        {camaras.length > 0 && <div className={styles.field}>
          <label htmlFor="camara-lectura">Cámara</label>
          <select id="camara-lectura" value={deviceId} onChange={(evento) => setDeviceId(evento.target.value)}>
            <option value="">Automática</option>
            {camaras.map((camara, indice) => <option key={camara.deviceId} value={camara.deviceId}>{camara.label || `Cámara ${indice + 1}`}</option>)}
          </select>
        </div>}
        {controles.zoom && <div className={styles.field}>
          <label htmlFor="zoom-camara">Zoom de cámara <output>{new Intl.NumberFormat('es-GT', { maximumFractionDigits: 1 }).format(zoom)}×</output></label>
          <input id="zoom-camara" type="range" min={controles.zoom.min} max={controles.zoom.max} step={controles.zoom.step} value={zoom}
            aria-describedby={errorZoom ? 'error-zoom-camara' : undefined}
            onChange={async (evento) => {
              const valor = Number(evento.target.value);
              const revision = ++revisionZoom.current;
              setZoom(valor); setErrorZoom('');
              try { await controles.zoom.aplicar(valor); }
              catch { if (revision === revisionZoom.current) setErrorZoom('No se pudo ajustar el zoom. Prueba otra posición.'); }
            }} />
          {errorZoom && <p id="error-zoom-camara" role="status" className={styles.error}>{errorZoom}</p>}
        </div>}
        {error && <div className={styles.error} role="alert">
          <p>{error}</p><button type="button" onClick={() => setIntento((valor) => valor + 1)}>Intentar de nuevo</button>
        </div>}
        <button className={styles.cancel} type="button" onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}
