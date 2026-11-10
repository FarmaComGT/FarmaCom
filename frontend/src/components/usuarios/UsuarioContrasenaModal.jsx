import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../ui/AccessibleDialog.jsx';
import { errorContrasena, REQUISITOS_CONTRASENA } from '../../utils/contrasena';
import styles from '../../styles/ManagementUI.module.css';
import local from './UsuarioContrasenaModal.module.css';

const CAMPOS = [
  { name: 'contrasena_nueva', label: 'Nueva contraseña', autocomplete: 'new-password' },
  { name: 'confirmacion', label: 'Confirmar nueva contraseña', autocomplete: 'new-password' },
  { name: 'contrasena_dueno', label: 'Tu contraseña de dueño', autocomplete: 'current-password' },
];

export default function UsuarioContrasenaModal({ usuario, esPropia, onClose, onSubmit, onSuccess }) {
  const [valores, setValores] = useState({ contrasena_nueva: '', confirmacion: '', contrasena_dueno: '' });
  const [visibles, setVisibles] = useState({});
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const formRef = useRef(null);
  const pendiente = useRef(false);
  const hayCambios = Object.values(valores).some(Boolean);

  useEffect(() => {
    if (!hayCambios) return undefined;
    const avisar = (evento) => { evento.preventDefault(); evento.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  useEffect(() => {
    formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [errores]);

  const cerrar = () => {
    if (pendiente.current) return;
    if (hayCambios && !window.confirm('¿Descartar los datos del restablecimiento?')) return;
    onClose();
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    if (pendiente.current) return;
    const nueva = valores.contrasena_nueva.trim();
    const dueno = valores.contrasena_dueno.trim();
    const validacion = {};
    if (errorContrasena(nueva)) validacion.contrasena_nueva = errorContrasena(nueva);
    if (!valores.confirmacion.trim() || valores.confirmacion.trim() !== nueva) validacion.confirmacion = 'Las contraseñas deben coincidir.';
    if (!dueno) validacion.contrasena_dueno = 'Ingresa tu contraseña para autorizar el cambio.';
    setErrores(validacion);
    if (Object.keys(validacion).length) return;
    pendiente.current = true;
    setGuardando(true);
    try {
      await onSubmit({ contrasena_nueva: nueva, contrasena_dueno: dueno });
      setValores({ contrasena_nueva: '', confirmacion: '', contrasena_dueno: '' });
      setVisibles({});
      onSuccess();
    } catch (error) {
      setErrores({ [error.message?.includes('dueño') ? 'contrasena_dueno' : 'contrasena_nueva']: error.message || 'No se pudo restablecer la contraseña. Intenta de nuevo.' });
    } finally {
      pendiente.current = false;
      setGuardando(false);
    }
  };

  return (
    <AccessibleDialog open labelledBy="restablecer-title" describedBy="restablecer-aviso" onClose={cerrar} busy={guardando}>
      <div className={`${styles.dialogContent} ${local.content}`}>
        <header className={styles.dialogHeader}>
          <div><h2 id="restablecer-title">Restablecer contraseña</h2><p>Actualiza el acceso a FarmaCom.</p></div>
          <button type="button" onClick={cerrar} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className={local.account}><strong>{usuario.nombre_usuario}</strong><span>{usuario.correo_usuario}</span></div>
        <form ref={formRef} onSubmit={guardar} noValidate className={styles.form} aria-busy={guardando}>
          {CAMPOS.map(({ name, label, autocomplete }) => (
            <div key={name} className={styles.field}>
              <label htmlFor={`restablecer-${name}`}>{label}</label>
              <div className={local.password}>
                <input id={`restablecer-${name}`} name={name} autoComplete={autocomplete} type={visibles[name] ? 'text' : 'password'}
                  value={valores[name]} onChange={(evento) => setValores((prev) => ({ ...prev, [name]: evento.target.value }))}
                  readOnly={guardando} spellCheck={false} autoCapitalize="none" className={styles.input}
                  aria-invalid={Boolean(errores[name])} aria-describedby={`${name === 'contrasena_nueva' ? 'restablecer-reglas ' : ''}${errores[name] ? `error-${name}` : ''}`.trim() || undefined} />
                <button type="button" onClick={() => setVisibles((prev) => ({ ...prev, [name]: !prev[name] }))}
                  aria-label={`${visibles[name] ? 'Ocultar' : 'Mostrar'}: ${label}`} aria-pressed={Boolean(visibles[name])} disabled={guardando}>
                  {visibles[name] ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {name === 'contrasena_nueva' && <p id="restablecer-reglas" className={local.help}>{REQUISITOS_CONTRASENA}</p>}
              {errores[name] && <p id={`error-${name}`} className={styles.fieldError} aria-live="polite">{errores[name]}</p>}
            </div>
          ))}
          <p id="restablecer-aviso" className={local.notice}>{esPropia ? 'Se cerrará tu sesión. Ingresa de nuevo con tu nueva contraseña.' : 'Se cerrarán las sesiones abiertas de esta cuenta. La persona deberá ingresar con la nueva contraseña.'}</p>
          <div className={styles.dialogActions}>
            <button type="button" onClick={cerrar} disabled={guardando} className={styles.button}>Cancelar</button>
            <button type="submit" disabled={guardando} className={`${styles.button} ${styles.primary}`}>
              {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}Restablecer contraseña
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
