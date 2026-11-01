import React, { useEffect } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import CajaDialog from './CajaDialog';
import ui from './CajaUI.module.css';
import styles from './CajaDialog.module.css';

export default function CajaFormModal({ abierta, editando, formulario, sucursales, cargandoSucursales, guardando, error, onClose, onChange, onSubmit }) {
  const campoInvalido = !formulario.id_sucursal ? 'caja-sucursal' : !formulario.nombre.trim() ? 'caja-nombre' : null;
  useEffect(() => { if (error && campoInvalido) document.getElementById(campoInvalido)?.focus(); }, [error, campoInvalido]);
  return <CajaDialog abierta={abierta} labelledBy="titulo-formulario-caja" onClose={onClose} ocupada={guardando}>
    <header className={styles.header}>
      <h2 id="titulo-formulario-caja" className={ui.sectionHeading}>{editando ? 'Editar caja' : 'Nueva caja'}</h2>
      <button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar" className={`${ui.button} ${ui.iconButton}`}><X size={18} aria-hidden="true" /></button>
    </header>
    <p className={ui.description}>{editando ? 'Actualiza el nombre de la caja en esta sucursal.' : 'Asigna un nombre y una sucursal a la nueva caja.'}</p>
    <form onSubmit={onSubmit} className={ui.form} noValidate>
      <div className={ui.field}>
        <label htmlFor="caja-sucursal">Sucursal</label>
        <select id="caja-sucursal" name="id_sucursal" value={formulario.id_sucursal} onChange={onChange} disabled={editando || cargandoSucursales || guardando} className={ui.input} aria-invalid={Boolean(error && campoInvalido === 'caja-sucursal')} aria-describedby={error && campoInvalido === 'caja-sucursal' ? 'error-formulario-caja' : undefined}>
          <option value="">{cargandoSucursales ? 'Cargando sucursales…' : 'Selecciona una sucursal'}</option>
          {sucursales.map((sucursal) => <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre_sucursal}</option>)}
        </select>
      </div>
      <div className={ui.field}>
        <label htmlFor="caja-nombre">Nombre de la caja</label>
        <input id="caja-nombre" name="nombre" autoComplete="off" value={formulario.nombre} onChange={onChange} disabled={guardando} maxLength={100} placeholder="Ej.: Caja principal…" className={ui.input} aria-invalid={Boolean(error && campoInvalido === 'caja-nombre')} aria-describedby={error ? 'error-formulario-caja' : undefined} />
        {error && <p id="error-formulario-caja" role="alert" className={ui.fieldError}>{error}</p>}
      </div>
      <div className={ui.actions}>
        <button type="button" onClick={onClose} disabled={guardando} className={ui.button}>Cancelar</button>
        <button type="submit" disabled={guardando} className={`${ui.button} ${ui.primary}`}>{guardando && <LoaderCircle size={16} className={ui.spinner} aria-hidden="true" />}{editando ? 'Guardar cambios' : 'Crear caja'}</button>
      </div>
    </form>
  </CajaDialog>;
}
