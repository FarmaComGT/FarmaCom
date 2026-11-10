import React, { useEffect, useRef } from 'react';
import { KeyRound, LoaderCircle, X } from 'lucide-react';
import AccessibleDialog from '../ui/AccessibleDialog.jsx';
import ContrasenaInput from './ContrasenaInput.jsx';
import { REQUISITOS_CONTRASENA } from '../../utils/contrasena';
import styles from '../../styles/ManagementUI.module.css';

const ROLES = [
  { value: 'dueno', label: 'Dueño' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'dependiente', label: 'Dependiente' },
  { value: 'laboratorista', label: 'Laboratorista' },
];

export default function UsuarioFormModal({
  isOpen,
  modoEdicion,
  formulario,
  sucursales,
  cargandoSucursales,
  laboratorios = [],
  cargandoLaboratorios,
  guardando,
  errorFormulario,
  onClose,
  onSubmit,
  onChange,
  rolesPermitidos = ROLES,
  onRestablecerContrasena,
}) {
  const tituloId = 'usuario-form-title';
  const errorRef = useRef(null);
  useEffect(() => {
    if (errorFormulario) errorRef.current?.focus();
  }, [errorFormulario]);
  const laboratorioNoDisponible = formulario.rol === 'laboratorista'
    && (cargandoLaboratorios || laboratorios.length === 0);

  return (
    <AccessibleDialog
      open={isOpen}
      labelledBy={tituloId}
      onClose={onClose}
      busy={guardando}
      size="medium"
    >
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{modoEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <p>{modoEdicion ? 'Actualiza su rol o asignación.' : 'Crea un acceso para una persona del equipo.'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={onSubmit} noValidate className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="nombre_usuario" className="campo-requerido">Nombre</label>
              <input aria-required="true"
                id="nombre_usuario"
                type="text"
                name="nombre_usuario"
                autoComplete="name"
                value={formulario.nombre_usuario}
                onChange={onChange}
                className={styles.input}
                placeholder="Ej.: Juan García…"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="correo_usuario" className="campo-requerido">Correo electrónico</label>
              <input aria-required="true"
                id="correo_usuario"
                type="email"
                inputMode="email"
                name="correo_usuario"
                autoComplete="email"
                spellCheck="false"
                value={formulario.correo_usuario}
                onChange={onChange}
                className={styles.input}
                placeholder="Ej.: juan@farmacom.com…"
              />
            </div>
          </div>

          {!modoEdicion && (
            <div className={styles.field}>
              <label htmlFor="contrasena_usuario" className="campo-requerido">Contraseña</label>
              <ContrasenaInput aria-required="true"
                id="contrasena_usuario"
                name="contrasena"
                autoComplete="new-password"
                value={formulario.contrasena}
                onChange={onChange}
                onGenerar={(value) => onChange({ target: { name: 'contrasena', value } })}
                disabled={guardando}
                className={styles.input}
                placeholder="Mínimo 15 caracteres…"
                minLength={15}
                aria-describedby="crear-contrasena-reglas"
              />
              <p id="crear-contrasena-reglas" className={styles.muted}>{REQUISITOS_CONTRASENA}</p>
            </div>
          )}

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="rol" className="campo-requerido">Rol</label>
              <select aria-required="true" id="rol" name="rol" value={formulario.rol} onChange={onChange} className={styles.input}>
                <option value="">Selecciona un rol</option>
                {rolesPermitidos.map((rol) => <option key={rol.value} value={rol.value}>{rol.label}</option>)}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="id_sucursal" className="campo-requerido">Sucursal</label>
              <select aria-required="true"
                id="id_sucursal"
                name="id_sucursal"
                value={formulario.id_sucursal}
                onChange={onChange}
                className={styles.input}
                disabled={cargandoSucursales}
              >
                <option value="">Selecciona una sucursal</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>{sucursal.nombre_sucursal}</option>
                ))}
              </select>
              {!cargandoSucursales && sucursales.length === 0 && <p className={styles.fieldError}>No hay sucursales registradas.</p>}
            </div>
          </div>

          {formulario.rol === 'laboratorista' && (
            <div className={styles.field}>
              <label htmlFor="id_laboratorio" className="campo-requerido">Laboratorio</label>
              <select
                id="id_laboratorio"
                name="id_laboratorio"
                value={formulario.id_laboratorio}
                onChange={onChange}
                className={styles.input}
                disabled={cargandoLaboratorios}
                required
              >
                <option value="">Selecciona un laboratorio</option>
                {laboratorios.map((laboratorio) => (
                  <option key={laboratorio.id_laboratorio} value={laboratorio.id_laboratorio}>{laboratorio.nombre_laboratorio}</option>
                ))}
              </select>
              {!cargandoLaboratorios && laboratorios.length === 0 && <p className={styles.fieldError}>No hay laboratorios activos registrados.</p>}
            </div>
          )}

          {modoEdicion && onRestablecerContrasena && <div className={styles.field}>
            <span className={styles.fieldLabel}>Acceso a la cuenta</span>
            <div><button type="button" className={styles.button} disabled={guardando} onClick={onRestablecerContrasena}>
              <KeyRound size={15} aria-hidden="true" />Restablecer contraseña…
            </button></div>
          </div>}

          {errorFormulario && <p ref={errorRef} tabIndex={-1} className={styles.fieldError} role="alert">{errorFormulario}</p>}

          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={guardando} className={styles.button}>Cancelar</button>
            <button
              type="submit"
              disabled={guardando || cargandoSucursales || sucursales.length === 0 || laboratorioNoDisponible}
              className={`${styles.button} ${styles.primary}`}
            >
              {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              {modoEdicion ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}
