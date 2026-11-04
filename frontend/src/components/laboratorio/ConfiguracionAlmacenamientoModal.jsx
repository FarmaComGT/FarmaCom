import React, { useRef, useState } from 'react';
import { FolderOpen, LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../ui/AccessibleDialog.jsx';
import ContentState from '../ui/ContentState.jsx';
import management from '../../styles/ManagementUI.module.css';
import laboratory from '../../styles/LaboratoryUI.module.css';
import { useToast } from '../../context/ToastContext.jsx';

export default function ConfiguracionAlmacenamientoModal({
  isOpen, soportado, carpetaConfigurada, onElegir, onReconectar, onClose,
}) {
  const toast = useToast();
  const avisoAcceso = useRef(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const necesitaReconectar = carpetaConfigurada;
  const tituloId = 'almacenamiento-title';

  const manejarAccion = async () => {
    toast.cerrar(avisoAcceso.current);
    setError(null);
    setProcesando(true);
    try {
      if (necesitaReconectar) {
        const ok = await onReconectar();
        if (!ok) setError('No se otorgó permiso sobre la carpeta local.');
      } else {
        await onElegir();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') avisoAcceso.current = toast.error('No se pudo acceder a la carpeta seleccionada. Intenta de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  const etiquetaAccion = necesitaReconectar ? 'Reconectar carpeta' : 'Elegir carpeta';

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={procesando} size="small">
      <div className={management.dialogContent}>
        <header className={management.dialogHeader}>
          <div>
            <h2 id={tituloId}>{necesitaReconectar ? 'Reconecta la carpeta local' : 'Configura el respaldo local'}</h2>
            <p>Conserva una copia de los resultados en esta computadora.</p>
          </div>
          {onClose && <button type="button" onClick={onClose} disabled={procesando} className={`${management.button} ${management.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>}
        </header>

        {!soportado ? (
          <ContentState
            variant="error"
            title="Navegador no compatible"
            message="Esta función solo está disponible en Google Chrome. Abre allí el módulo de laboratorio para configurar el respaldo local."
            compact
          />
        ) : (
          <div className={management.form}>
            <div className={laboratory.storageIntro}>
              <span className={laboratory.storageIcon}><FolderOpen size={20} aria-hidden="true" /></span>
              <p>{necesitaReconectar
                ? 'Por seguridad, el navegador olvida el permiso de acceso después de reiniciarse y debe solicitarlo nuevamente.'
                : 'Los resultados en PDF solo permanecen 6 meses en el servidor. Mientras no se elija una carpeta, no se creará una copia local organizada por paciente.'}</p>
            </div>
            {error && <p role="alert" className={management.fieldError}>{error}</p>}
            <div className={management.dialogActions}>
              <button
                type="button"
                onClick={manejarAccion}
                disabled={procesando}
                aria-label={procesando ? 'Procesando…' : etiquetaAccion}
                className={`${management.button} ${management.primary}`}
              >
                {procesando && <LoaderCircle size={15} className={management.spinner} aria-hidden="true" />} {etiquetaAccion}
              </button>
            </div>
          </div>
        )}
      </div>
    </AccessibleDialog>
  );
}
