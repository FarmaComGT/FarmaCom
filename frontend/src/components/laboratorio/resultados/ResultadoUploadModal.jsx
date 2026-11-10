import React, { useEffect, useRef, useState } from 'react';
import { FileUp, LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import management from '../../../styles/ManagementUI.module.css';
import laboratory from '../../../styles/LaboratoryUI.module.css';

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

export default function ResultadoUploadModal({
  isOpen, categoriasSugeridas = [], subiendo, errorFormulario, onClose, onSubmit,
}) {
  const [categoria, setCategoria] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [errorLocal, setErrorLocal] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputArchivoRef = useRef(null);
  const errorRef = useRef(null);
  const tituloId = 'resultado-upload-title';

  useEffect(() => {
    if (!isOpen) return;
    setCategoria('');
    setArchivo(null);
    setErrorLocal(null);
    setArrastrando(false);
  }, [isOpen]);

  useEffect(() => {
    if (errorLocal || errorFormulario) errorRef.current?.focus();
  }, [errorLocal, errorFormulario]);

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

  const manejarEnvio = (event) => {
    event.preventDefault();
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

  const activarSelector = () => inputArchivoRef.current?.click();

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={subiendo} size="medium">
      <div className={management.dialogContent}>
        <header className={management.dialogHeader}>
          <div><h2 id={tituloId}>Nuevo resultado</h2><p>Adjunta el PDF al expediente del paciente.</p></div>
          <button type="button" onClick={onClose} disabled={subiendo} className={`${management.button} ${management.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <form onSubmit={manejarEnvio} noValidate className={management.form}>
          <div className={management.formGrid}>
            <div className={management.field}>
              <label htmlFor="categoria_resultado" className="campo-requerido">Categoría del examen</label>
              <input aria-required="true" id="categoria_resultado" name="categoria_resultado" list="categorias-sugeridas" type="text" value={categoria} onChange={(event) => setCategoria(event.target.value)} placeholder="Ej.: Hematología…" maxLength={100} className={management.input} />
              <datalist id="categorias-sugeridas">{categoriasSugeridas.map((cat) => <option key={cat} value={cat} />)}</datalist>
            </div>
            <div className={management.field}>
              <label htmlFor="fecha_resultado">Fecha de carga</label>
              <input id="fecha_resultado" type="text" value={new Intl.DateTimeFormat('es-GT').format(new Date())} disabled className={management.input} readOnly />
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Elige el archivo y suéltalo aquí"
            className={`${laboratory.dropzone} ${arrastrando ? laboratory.dropzoneActive : ''}`}
            onClick={activarSelector}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') activarSelector(); }}
            onDragOver={(event) => { event.preventDefault(); setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(event) => { event.preventDefault(); setArrastrando(false); validarYAsignarArchivo(event.dataTransfer.files?.[0]); }}
          >
            <FileUp size={28} aria-hidden="true" />
            <strong>{archivo ? archivo.name : 'Selecciona o arrastra el resultado'}</strong>
            <span>Archivo PDF de hasta 10&nbsp;MB</span>
            <input ref={inputArchivoRef} type="file" accept="application/pdf" onChange={(event) => validarYAsignarArchivo(event.target.files?.[0])} className={laboratory.hiddenInput} tabIndex={-1} />
          </div>

          {(errorLocal || errorFormulario) && <p ref={errorRef} tabIndex={-1} role="alert" className={management.fieldError}>{errorLocal || errorFormulario}</p>}

          <div className={management.dialogActions}>
            <button type="button" onClick={onClose} disabled={subiendo} className={management.button}>Cancelar</button>
            <button type="submit" disabled={subiendo} className={`${management.button} ${management.primary}`}>
              {subiendo && <LoaderCircle size={15} className={management.spinner} aria-hidden="true" />} Subir resultado
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
