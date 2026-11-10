import React, { useEffect, useRef, useState } from 'react';
import { Copy, Eye, EyeOff, LoaderCircle, RefreshCw } from 'lucide-react';
import { generarContrasena } from '../../utils/contrasena';
import styles from '../../styles/ManagementUI.module.css';
import local from './ContrasenaInput.module.css';

export default function ContrasenaInput({ value, onChange, onGenerar, disabled, ...props }) {
  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [copiando, setCopiando] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    setMensaje('');
    if (!value) setVisible(false);
  }, [value]);

  const generar = () => {
    try {
      const clave = generarContrasena();
      onGenerar(clave);
      setVisible(true);
      inputRef.current?.focus();
    } catch {
      setMensaje('No se pudo generar la contraseña. Puedes escribir una.');
    }
  };
  const copiar = async () => {
    setCopiando(true);
    try {
      await navigator.clipboard.writeText(value);
      setMensaje('Contraseña copiada.');
    } catch {
      setVisible(true);
      inputRef.current?.focus();
      inputRef.current?.select();
      setMensaje('No se pudo copiar automáticamente. Copia el texto seleccionado.');
    } finally { setCopiando(false); }
  };
  return <div className={local.container}>
    <div className={local.inputWrap}>
      <input {...props} ref={inputRef} type={visible ? 'text' : 'password'} value={value} onChange={onChange}
        readOnly={disabled} className={styles.input} spellCheck={false} autoCapitalize="none" autoCorrect="off" />
      <button type="button" disabled={disabled} onClick={() => setVisible((prev) => !prev)}
        aria-label={`${visible ? 'Ocultar' : 'Mostrar'}: ${props.name === 'contrasena' ? 'Contraseña' : 'Nueva contraseña'}`} aria-pressed={visible}>
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
    <div className={local.actions}>
      <button type="button" className={styles.button} onClick={generar} disabled={disabled || copiando}>
        <RefreshCw size={15} aria-hidden="true" />Generar contraseña
      </button>
      <button type="button" className={styles.button} onClick={copiar} disabled={disabled || copiando || !value}>
        {copiando ? <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}Copiar
      </button>
    </div>
    <p className={local.feedback} aria-live="polite" role="status">{mensaje}</p>
  </div>;
}
