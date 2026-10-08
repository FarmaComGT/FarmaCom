import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { FolderOpen, X } from 'lucide-react';

export default function ConfiguracionAlmacenamientoModal({
  isOpen,
  soportado,
  carpetaConfigurada,
  onElegir,
  onReconectar,
  onClose,
}) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || typeof document === 'undefined') return null;

  const necesitaReconectar = carpetaConfigurada;

  const manejarAccion = async () => {
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
      if (err?.name !== 'AbortError') {
        setError('No se pudo acceder a la carpeta seleccionada. Intenta de nuevo.');
      }
    } finally {
      setProcesando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 my-auto"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-headline font-extrabold text-primary">
            {necesitaReconectar ? 'Reconecta la carpeta local' : 'Configura el respaldo local'}
          </h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          {!soportado ? (
            <p className="text-sm text-slate-700">
              Esta función solo está disponible en Google Chrome. Abre el módulo de laboratorio
              desde Chrome en esta computadora para poder subir resultados.
            </p>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FolderOpen className="w-5 h-5" />
                </span>
                <p className="text-sm text-slate-700">
                  {necesitaReconectar
                    ? 'Por seguridad, el navegador olvida el permiso de acceso a tu carpeta cada vez que se reinicia. Vuelve a otorgar el permiso para continuar subiendo o viendo resultados en esta computadora.'
                    : 'Los resultados en PDF solo permanecen 6 meses en el servidor. Elige una carpeta en esta computadora donde se guardará automáticamente una copia de cada PDF subido, organizada por paciente, para que sigan disponibles después de ese tiempo.'}
                </p>
              </div>
              {!necesitaReconectar && (
                <p className="text-xs text-slate-500">
                  Mientras no se elija una carpeta, no se podrán subir nuevos resultados.
                </p>
              )}
            </>
          )}

          {error && <p className="text-sm text-error font-semibold">{error}</p>}

          {soportado && (
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={manejarAccion}
                disabled={procesando}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
              >
                {procesando
                  ? 'Procesando...'
                  : necesitaReconectar ? 'Reconectar carpeta' : 'Elegir carpeta'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
