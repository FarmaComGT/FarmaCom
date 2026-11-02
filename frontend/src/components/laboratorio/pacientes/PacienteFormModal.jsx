import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import { abrirSelectorFecha } from '../../../utils/datePicker';
import management from '../../../styles/ManagementUI.module.css';
import laboratory from '../../../styles/LaboratoryUI.module.css';

const ESTADO_INICIAL = {
  nombre_paciente: '', dpi: '', sexo: '', modoEdad: 'fecha', fecha_nacimiento: '',
  edad_manual: '', telefono: '', direccion: '', observaciones: '',
};

const OPCIONES_SEXO = [
  { valor: 'M', etiqueta: 'Masculino' },
  { valor: 'F', etiqueta: 'Femenino' },
  { valor: 'Otro', etiqueta: 'Otro' },
];

export default function PacienteFormModal({
  isOpen, modoEdicion, paciente, guardando, errorFormulario, onClose, onSubmit,
}) {
  const [formulario, setFormulario] = useState(ESTADO_INICIAL);
  const [errorLocal, setErrorLocal] = useState(null);
  const errorRef = useRef(null);
  const fechaNacimientoRef = useRef(null);
  const tituloId = 'paciente-form-title';

  useEffect(() => {
    if (!isOpen) return;
    setErrorLocal(null);
    if (modoEdicion && paciente) {
      setFormulario({
        nombre_paciente: paciente.nombre_paciente || '',
        dpi: paciente.dpi || '',
        sexo: paciente.sexo || '',
        modoEdad: paciente.fecha_nacimiento ? 'fecha' : 'manual',
        fecha_nacimiento: paciente.fecha_nacimiento ? paciente.fecha_nacimiento.slice(0, 10) : '',
        edad_manual: paciente.edad_manual != null ? String(paciente.edad_manual) : '',
        telefono: paciente.telefono || '',
        direccion: paciente.direccion || '',
        observaciones: paciente.observaciones || '',
      });
    } else {
      setFormulario(ESTADO_INICIAL);
    }
  }, [isOpen, modoEdicion, paciente]);

  useEffect(() => {
    if (errorLocal || errorFormulario) errorRef.current?.focus();
  }, [errorLocal, errorFormulario]);

  const manejarCambio = ({ target: { name, value } }) => {
    setFormulario((actual) => ({ ...actual, [name]: value }));
  };

  const manejarEnvio = (event) => {
    event.preventDefault();
    if (!formulario.sexo) {
      setErrorLocal('Selecciona el sexo del paciente.');
      return;
    }
    if (formulario.modoEdad === 'fecha' && !formulario.fecha_nacimiento) {
      setErrorLocal('Ingresa la fecha de nacimiento.');
      return;
    }
    if (formulario.modoEdad === 'manual' && formulario.edad_manual === '') {
      setErrorLocal('Ingresa la edad del paciente.');
      return;
    }

    setErrorLocal(null);
    onSubmit({
      nombre_paciente: formulario.nombre_paciente.trim(),
      dpi: formulario.dpi.trim() || null,
      sexo: formulario.sexo,
      fecha_nacimiento: formulario.modoEdad === 'fecha' ? formulario.fecha_nacimiento : null,
      edad_manual: formulario.modoEdad === 'manual' ? Number(formulario.edad_manual) : null,
      telefono: formulario.telefono.trim() || null,
      direccion: formulario.direccion.trim() || null,
      observaciones: formulario.observaciones.trim() || null,
    });
  };

  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={guardando} size="large">
      <div className={management.dialogContent}>
        <header className={management.dialogHeader}>
          <div>
            <h2 id={tituloId}>{modoEdicion ? 'Editar paciente' : 'Nuevo paciente'}</h2>
            <p>Registra los datos de identificación y contacto del expediente.</p>
          </div>
          <button type="button" onClick={onClose} disabled={guardando} className={`${management.button} ${management.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={manejarEnvio} noValidate className={management.form}>
          <div className={management.field}>
            <label htmlFor="nombre_paciente">Nombre completo</label>
            <input id="nombre_paciente" name="nombre_paciente" type="text" autoComplete="name" required maxLength={150} value={formulario.nombre_paciente} onChange={manejarCambio} placeholder="Ej.: Ana López…" className={management.input} />
          </div>

          <div className={management.formGrid}>
            <div className={management.field}>
              <label htmlFor="dpi">DPI <span className={management.optional}>(opcional)</span></label>
              <input id="dpi" name="dpi" type="text" inputMode="numeric" autoComplete="off" maxLength={20} value={formulario.dpi} onChange={manejarCambio} placeholder="Ej.: 1234567890101…" className={management.input} />
            </div>
            <div className={management.field}>
              <label htmlFor="telefono">Teléfono <span className={management.optional}>(opcional)</span></label>
              <input id="telefono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={formulario.telefono} onChange={manejarCambio} placeholder="Ej.: 5555-1111…" className={management.input} />
            </div>
          </div>

          <fieldset className={management.field}>
            <legend className={management.fieldLabel}>Sexo</legend>
            <div className={laboratory.choiceGroup}>
              {OPCIONES_SEXO.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  aria-pressed={formulario.sexo === opcion.valor}
                  onClick={() => setFormulario((actual) => ({ ...actual, sexo: opcion.valor }))}
                  className={`${laboratory.choiceButton} ${formulario.sexo === opcion.valor ? 'border-primary' : ''}`}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={management.field}>
            <legend className={management.fieldLabel}>Edad</legend>
            <div className={laboratory.segmented}>
              <button type="button" aria-pressed={formulario.modoEdad === 'fecha'} onClick={() => setFormulario((actual) => ({ ...actual, modoEdad: 'fecha' }))} className={laboratory.segmentButton}>Fecha de nacimiento</button>
              <button type="button" aria-pressed={formulario.modoEdad === 'manual'} onClick={() => setFormulario((actual) => ({ ...actual, modoEdad: 'manual' }))} className={laboratory.segmentButton}>Edad manual</button>
            </div>
            {formulario.modoEdad === 'fecha' ? (
              <input ref={fechaNacimientoRef} type="date" name="fecha_nacimiento" aria-label="Fecha de nacimiento" value={formulario.fecha_nacimiento} onChange={manejarCambio} onClick={() => abrirSelectorFecha(fechaNacimientoRef)} max={new Date().toISOString().slice(0, 10)} className={`${management.input} ${laboratory.clickableDate}`} />
            ) : (
              <input type="number" name="edad_manual" aria-label="Edad manual" inputMode="numeric" value={formulario.edad_manual} onChange={manejarCambio} placeholder="Ej. 45" min="0" max="120" step="1" className={management.input} />
            )}
          </fieldset>

          <div className={management.field}>
            <label htmlFor="direccion">Dirección <span className={management.optional}>(opcional)</span></label>
            <input id="direccion" name="direccion" type="text" autoComplete="street-address" maxLength={500} value={formulario.direccion} onChange={manejarCambio} placeholder="Ej.: 6a avenida 4-20…" className={management.input} />
          </div>

          <div className={management.field}>
            <label htmlFor="observaciones">Observaciones <span className={management.optional}>(opcional)</span></label>
            <textarea id="observaciones" name="observaciones" maxLength={2000} rows={3} value={formulario.observaciones} onChange={manejarCambio} placeholder="Información relevante para el expediente…" className={management.input} />
          </div>

          {(errorLocal || errorFormulario) && <p ref={errorRef} tabIndex={-1} role="alert" className={management.fieldError}>{errorLocal || errorFormulario}</p>}

          <div className={management.dialogActions}>
            <button type="button" onClick={onClose} disabled={guardando} className={management.button}>Cancelar</button>
            <button type="submit" disabled={guardando} className={`${management.button} ${management.primary}`}>
              {guardando && <LoaderCircle size={15} className={management.spinner} aria-hidden="true" />}
              {modoEdicion ? 'Guardar cambios' : 'Guardar paciente'}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
