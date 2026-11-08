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

const fechaActualGuatemala = () => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const valor = (tipo) => Number(partes.find((parte) => parte.type === tipo)?.value);
  return {
    texto: `${valor('year')}-${String(valor('month')).padStart(2, '0')}-${String(valor('day')).padStart(2, '0')}`,
    fecha: new Date(Date.UTC(valor('year'), valor('month') - 1, valor('day'))),
  };
};

export default function PacienteFormModal({
  isOpen, modoEdicion, paciente, guardando, errorFormulario, onClose, onSubmit,
}) {
  const [formulario, setFormulario] = useState(ESTADO_INICIAL);
  const [errorLocal, setErrorLocal] = useState(null);
  const errorRef = useRef(null);
  const nombreRef = useRef(null);
  const dpiRef = useRef(null);
  const telefonoRef = useRef(null);
  const sexoRef = useRef(null);
  const fechaNacimientoRef = useRef(null);
  const edadManualRef = useRef(null);
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
    if (errorLocal?.campo) {
      const referencias = {
        nombre_paciente: nombreRef,
        dpi: dpiRef,
        telefono: telefonoRef,
        sexo: sexoRef,
        fecha_nacimiento: fechaNacimientoRef,
        edad_manual: edadManualRef,
      };
      referencias[errorLocal.campo]?.current?.focus();
    } else if (errorFormulario) {
      errorRef.current?.focus();
    }
  }, [errorLocal, errorFormulario]);

  const manejarCambio = ({ target: { name, value } }) => {
    setFormulario((actual) => ({ ...actual, [name]: value }));
  };

  const manejarEnvio = (event) => {
    event.preventDefault();
    const nombre = formulario.nombre_paciente.trim();
    const dpi = formulario.dpi.trim().replace(/[\s-]+/g, '');
    const telefono = formulario.telefono.trim();
    if (nombre.length < 2 || !/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u.test(nombre)) {
      setErrorLocal({ campo: 'nombre_paciente', mensaje: 'Ingresa un nombre válido usando letras.' });
      return;
    }
    if (dpi && !/^\d{13}$/.test(dpi)) {
      setErrorLocal({ campo: 'dpi', mensaje: 'El DPI debe contener exactamente 13 dígitos.' });
      return;
    }
    if (telefono) {
      const cantidadDigitos = telefono.replace(/\D/g, '').length;
      if (!/^[\d\s()+-]+$/.test(telefono) || cantidadDigitos < 8 || cantidadDigitos > 15) {
        setErrorLocal({ campo: 'telefono', mensaje: 'Ingresa un teléfono de 8 a 15 dígitos.' });
        return;
      }
    }
    if (!formulario.sexo) {
      setErrorLocal({ campo: 'sexo', mensaje: 'Selecciona el sexo del paciente.' });
      return;
    }
    if (formulario.modoEdad === 'fecha' && !formulario.fecha_nacimiento) {
      setErrorLocal({ campo: 'fecha_nacimiento', mensaje: 'Ingresa la fecha de nacimiento.' });
      return;
    }
    if (formulario.modoEdad === 'fecha') {
      const fecha = new Date(`${formulario.fecha_nacimiento}T00:00:00Z`);
      const { fecha: hoy } = fechaActualGuatemala();
      const fechaMinima = new Date(Date.UTC(
        hoy.getUTCFullYear() - 121, hoy.getUTCMonth(), hoy.getUTCDate(),
      ));
      if (Number.isNaN(fecha.getTime()) || fecha > hoy || fecha <= fechaMinima) {
        setErrorLocal({
          campo: 'fecha_nacimiento',
          mensaje: 'La fecha no puede ser futura ni corresponder a más de 120 años.',
        });
        return;
      }
    }
    if (formulario.modoEdad === 'manual' && formulario.edad_manual === '') {
      setErrorLocal({ campo: 'edad_manual', mensaje: 'Ingresa la edad del paciente.' });
      return;
    }
    if (formulario.modoEdad === 'manual'
      && (!Number.isInteger(Number(formulario.edad_manual))
        || Number(formulario.edad_manual) < 0
        || Number(formulario.edad_manual) > 120)) {
      setErrorLocal({ campo: 'edad_manual', mensaje: 'La edad debe ser un entero entre 0 y 120.' });
      return;
    }

    setErrorLocal(null);
    onSubmit({
      nombre_paciente: nombre,
      dpi: dpi || null,
      sexo: formulario.sexo,
      fecha_nacimiento: formulario.modoEdad === 'fecha' ? formulario.fecha_nacimiento : null,
      edad_manual: formulario.modoEdad === 'manual' ? Number(formulario.edad_manual) : null,
      telefono: telefono || null,
      direccion: formulario.direccion.trim() || null,
      observaciones: formulario.observaciones.trim() || null,
    });
  };

  const errorDe = (campo) => errorLocal?.campo === campo ? errorLocal.mensaje : null;

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
            <input ref={nombreRef} id="nombre_paciente" name="nombre_paciente" type="text" autoComplete="name" required maxLength={150} value={formulario.nombre_paciente} onChange={manejarCambio} placeholder="Ej.: Ana López…" className={management.input} aria-invalid={Boolean(errorDe('nombre_paciente'))} aria-describedby={errorDe('nombre_paciente') ? 'error-nombre-paciente' : undefined} />
            {errorDe('nombre_paciente') && <p id="error-nombre-paciente" role="alert" className={management.fieldError}>{errorDe('nombre_paciente')}</p>}
          </div>

          <div className={management.formGrid}>
            <div className={management.field}>
              <label htmlFor="dpi">DPI <span className={management.optional}>(opcional)</span></label>
              <input ref={dpiRef} id="dpi" name="dpi" type="text" inputMode="numeric" autoComplete="off" spellCheck="false" maxLength={20} value={formulario.dpi} onChange={manejarCambio} placeholder="Ej.: 1234567890101…" className={management.input} aria-invalid={Boolean(errorDe('dpi'))} aria-describedby={errorDe('dpi') ? 'error-dpi' : undefined} />
              {errorDe('dpi') && <p id="error-dpi" role="alert" className={management.fieldError}>{errorDe('dpi')}</p>}
            </div>
            <div className={management.field}>
              <label htmlFor="telefono">Teléfono <span className={management.optional}>(opcional)</span></label>
              <input ref={telefonoRef} id="telefono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={formulario.telefono} onChange={manejarCambio} placeholder="Ej.: 5555-1111…" className={management.input} aria-invalid={Boolean(errorDe('telefono'))} aria-describedby={errorDe('telefono') ? 'error-telefono' : undefined} />
              {errorDe('telefono') && <p id="error-telefono" role="alert" className={management.fieldError}>{errorDe('telefono')}</p>}
            </div>
          </div>

          <fieldset className={management.field}>
            <legend className={management.fieldLabel}>Sexo</legend>
            <div className={laboratory.choiceGroup}>
              {OPCIONES_SEXO.map((opcion) => (
                <button
                  ref={opcion.valor === 'M' ? sexoRef : undefined}
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
            {errorDe('sexo') && <p role="alert" className={management.fieldError}>{errorDe('sexo')}</p>}
          </fieldset>

          <fieldset className={management.field}>
            <legend className={management.fieldLabel}>Edad</legend>
            <div className={laboratory.segmented}>
              <button type="button" aria-pressed={formulario.modoEdad === 'fecha'} onClick={() => setFormulario((actual) => ({ ...actual, modoEdad: 'fecha' }))} className={laboratory.segmentButton}>Fecha de nacimiento</button>
              <button type="button" aria-pressed={formulario.modoEdad === 'manual'} onClick={() => setFormulario((actual) => ({ ...actual, modoEdad: 'manual' }))} className={laboratory.segmentButton}>Edad manual</button>
            </div>
            {formulario.modoEdad === 'fecha' ? (
              <input ref={fechaNacimientoRef} type="date" name="fecha_nacimiento" aria-label="Fecha de nacimiento" value={formulario.fecha_nacimiento} onChange={manejarCambio} onClick={() => abrirSelectorFecha(fechaNacimientoRef)} max={fechaActualGuatemala().texto} className={`${management.input} ${laboratory.clickableDate}`} aria-invalid={Boolean(errorDe('fecha_nacimiento'))} aria-describedby={errorDe('fecha_nacimiento') ? 'error-fecha-nacimiento' : undefined} />
            ) : (
              <input ref={edadManualRef} type="number" name="edad_manual" aria-label="Edad manual" inputMode="numeric" value={formulario.edad_manual} onChange={manejarCambio} placeholder="Ej.: 45…" min="0" max="120" step="1" className={management.input} aria-invalid={Boolean(errorDe('edad_manual'))} aria-describedby={errorDe('edad_manual') ? 'error-edad-manual' : undefined} />
            )}
            {errorDe('fecha_nacimiento') && <p id="error-fecha-nacimiento" role="alert" className={management.fieldError}>{errorDe('fecha_nacimiento')}</p>}
            {errorDe('edad_manual') && <p id="error-edad-manual" role="alert" className={management.fieldError}>{errorDe('edad_manual')}</p>}
          </fieldset>

          <div className={management.field}>
            <label htmlFor="direccion">Dirección <span className={management.optional}>(opcional)</span></label>
            <input id="direccion" name="direccion" type="text" autoComplete="street-address" maxLength={500} value={formulario.direccion} onChange={manejarCambio} placeholder="Ej.: 6a avenida 4-20…" className={management.input} />
          </div>

          <div className={management.field}>
            <label htmlFor="observaciones">Observaciones <span className={management.optional}>(opcional)</span></label>
            <textarea id="observaciones" name="observaciones" maxLength={2000} rows={3} value={formulario.observaciones} onChange={manejarCambio} placeholder="Información relevante para el expediente…" className={management.input} />
          </div>

          {errorFormulario && <p ref={errorRef} tabIndex={-1} role="alert" className={management.fieldError}>{errorFormulario}</p>}

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
