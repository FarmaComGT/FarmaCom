import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Download, X } from 'lucide-react';

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

export default function ResultadoUploadModal({
  isOpen,
  categoriasSugeridas = [],
  subiendo,
  errorFormulario,
  onClose,
  onSubmit,
}) {
  const [categoria, setCategoria] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [errorLocal, setErrorLocal] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputArchivoRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setCategoria('');
    setArchivo(null);
    setErrorLocal(null);
    setArrastrando(false);
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const validarYAsignarArchivo = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErrorLocal('Solo se aceptan archivos PDF.');
      return;
    }
    if (file.size > TAMANO_MAXIMO_BYTES) {
      setErrorLocal('El archivo supera el tamaño máximo permitido (10 MB).');
      return;
    }
    setErrorLocal(null);
    setArchivo(file);
  };

  const manejarSoltar = (e) => {
    e.preventDefault();
    setArrastrando(false);
    validarYAsignarArchivo(e.dataTransfer.files?.[0]);
  };

  const manejarSeleccion = (e) => {
    validarYAsignarArchivo(e.target.files?.[0]);
  };

  const manejarEnvio = (e) => {
    e.preventDefault();

    if (!categoria.trim()) {
      setErrorLocal('Ingresa la categoría del examen.');
      return;
    }
    if (!archivo) {
      setErrorLocal('Selecciona el archivo PDF del resultado.');
      return;
    }

    setErrorLocal(null);
    onSubmit({ categoria: categoria.trim(), archivo });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 my-auto"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-headline font-extrabold text-primary">Nuevo resultado</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={subiendo}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="categoria_resultado" className="text-sm font-semibold text-slate-700">
                Categoría del examen <span className="text-error">*</span>
              </label>
              <input
                id="categoria_resultado"
                list="categorias-sugeridas"
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej. Hematología"
                maxLength={100}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <datalist id="categorias-sugeridas">
                {categoriasSugeridas.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label htmlFor="fecha_resultado" className="text-sm font-semibold text-slate-700">
                Fecha
              </label>
              <input
                id="fecha_resultado"
                type="text"
                value={new Date().toLocaleDateString('es-GT')}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={manejarSoltar}
            onClick={() => inputArchivoRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputArchivoRef.current?.click();
            }}
            aria-label="Elige el archivo y suéltalo aquí"
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
              arrastrando ? 'border-white bg-primary-container' : 'border-white/60 bg-primary'
            }`}
          >
            <Download className="w-8 h-8 text-white" />
            <p className="text-sm font-bold text-white">
              {archivo ? archivo.name : 'Elige el archivo y suéltalo aquí'}
            </p>
            <input
              ref={inputArchivoRef}
              type="file"
              accept="application/pdf"
              onChange={manejarSeleccion}
              className="hidden"
            />
          </div>
          <p className="text-xs text-slate-500">Solo PDF, máximo 10 MB.</p>

          {(errorLocal || errorFormulario) && (
            <p className="text-sm text-error font-semibold">{errorLocal || errorFormulario}</p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={subiendo}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={subiendo}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
            >
              {subiendo ? 'Subiendo...' : 'Subir resultado'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body,
  );
}
