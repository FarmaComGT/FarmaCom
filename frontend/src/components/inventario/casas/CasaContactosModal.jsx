import React, { useId, useState } from 'react';
import { Check, LoaderCircle, Mail, Pencil, Phone, Plus, Trash2, Truck, X } from 'lucide-react';
import useContactosCasa from '../../../hooks/useContactosCasa';
import AccessibleDialog from '../../ui/AccessibleDialog.jsx';
import ContentState from '../../ui/ContentState.jsx';
import styles from '../../../styles/ManagementUI.module.css';

function ContactoItem({ label, type = 'text', onActualizar, onSolicitarEliminar, eliminando }) {
  const campoId = useId();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(label);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const tipoContacto = type === 'email' ? 'correo' : 'teléfono';

  const cancelarEdicion = () => {
    setValor(label);
    setEditando(false);
    setError('');
  };

  const guardarEdicion = async (evento) => {
    evento.preventDefault();
    const valorLimpio = valor.trim();
    if (!valorLimpio || valorLimpio === label) {
      cancelarEdicion();
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await onActualizar(valorLimpio);
      setEditando(false);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo actualizar');
    } finally {
      setGuardando(false);
    }
  };

  if (editando) {
    return (
      <li className={styles.contactItem}>
        <form onSubmit={guardarEdicion} className={styles.contactForm}>
          <label className={styles.visuallyHidden} htmlFor={campoId}>Editar {tipoContacto}</label>
          <input
            id={campoId}
            name={type === 'email' ? 'editar_correo' : 'editar_telefono'}
            type={type}
            inputMode={type === 'email' ? 'email' : 'tel'}
            autoComplete={type === 'email' ? 'email' : 'tel'}
            spellCheck={type === 'email' ? 'false' : undefined}
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
            aria-invalid={Boolean(error)}
            className={styles.input}
          />
          <button type="submit" disabled={guardando || !valor.trim()} className={`${styles.button} ${styles.iconButton} ${styles.primary}`} aria-label="Guardar">
            {guardando ? <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
          </button>
          <button type="button" onClick={cancelarEdicion} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cancelar">
            <X size={15} aria-hidden="true" />
          </button>
        </form>
        {error && <p role="alert" className={styles.fieldError}>{error}</p>}
      </li>
    );
  }

  return (
    <li className={styles.contactItem}>
      <span className={styles.contactValue}>{label}</span>
      <div className={styles.contactActions}>
        <button type="button" onClick={() => setEditando(true)} disabled={eliminando} className={`${styles.button} ${styles.iconButton}`} aria-label="Editar">
          <Pencil size={15} aria-hidden="true" />
        </button>
        <button type="button" onClick={onSolicitarEliminar} disabled={eliminando} className={`${styles.button} ${styles.iconButton} ${styles.danger}`} aria-label="Eliminar">
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function AgregarInput({ id, label, placeholder, type = 'text', onAgregar }) {
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    const valorLimpio = valor.trim();
    if (!valorLimpio) return;
    setError('');
    setGuardando(true);
    try {
      await onAgregar(valorLimpio);
      setValor('');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo agregar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={manejarEnvio} className={styles.contactAddForm}>
      <label className={styles.visuallyHidden} htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={type === 'email' ? 'email' : 'tel'}
        autoComplete={type === 'email' ? 'email' : 'tel'}
        spellCheck={type === 'email' ? 'false' : undefined}
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={styles.input}
      />
      <button type="submit" disabled={guardando || !valor.trim()} className={`${styles.button} ${styles.primary}`}>
        {guardando ? <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
        Agregar
      </button>
      {error && <p role="alert" className={styles.fieldError}>{error}</p>}
    </form>
  );
}

export default function CasaContactosModal({ isOpen, casa, onClose }) {
  const [contactoAEliminar, setContactoAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorEliminacion, setErrorEliminacion] = useState('');
  const {
    telefonos,
    correos,
    proveedores,
    cargando,
    error,
    refrescar,
    agregarTelefono,
    actualizarTelefono,
    eliminarTelefono,
    agregarCorreo,
    actualizarCorreo,
    eliminarCorreo,
  } = useContactosCasa(isOpen ? casa?.id_casa : null);

  if (!casa) return null;
  const tituloId = 'titulo-contactos-casa';

  const solicitarEliminarContacto = (contacto) => {
    setErrorEliminacion('');
    setContactoAEliminar(contacto);
  };

  const confirmarEliminarContacto = async () => {
    if (!contactoAEliminar) return;
    setEliminandoId(`${contactoAEliminar.tipo}-${contactoAEliminar.id}`);
    setErrorEliminacion('');
    try {
      if (contactoAEliminar.tipo === 'tel') await eliminarTelefono(contactoAEliminar.id);
      else await eliminarCorreo(contactoAEliminar.id);
      setContactoAEliminar(null);
    } catch (err) {
      setErrorEliminacion(err.response?.data?.mensaje || 'No se pudo eliminar el contacto.');
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <>
      <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} size="medium">
        <div className={styles.dialogContent}>
          <header className={styles.dialogHeader}>
            <div>
              <h2 id={tituloId}>{casa.nombre}</h2>
              <p>Administra teléfonos y correos; consulta sus proveedores asociados.</p>
            </div>
            <button type="button" onClick={onClose} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
              <X size={17} aria-hidden="true" />
            </button>
          </header>

          {cargando ? (
            <ContentState compact variant="loading" message="Cargando información…" />
          ) : error ? (
            <ContentState compact variant="error" title="No se pudieron cargar los contactos" message={error} onRetry={refrescar} />
          ) : (
            <div className={styles.contactSections}>
              <section className={styles.contactSection} aria-labelledby="contactos-telefonos-title">
                <h3 id="contactos-telefonos-title" className={styles.contactHeading}><Phone size={16} aria-hidden="true" />Teléfonos</h3>
                {telefonos.length === 0 ? <p className={styles.contactEmpty}>Sin teléfonos registrados.</p> : (
                  <ul className={styles.contactList}>
                    {telefonos.map((telefono) => (
                      <ContactoItem key={telefono.id_telefono} label={telefono.numero} onActualizar={(numero) => actualizarTelefono(telefono.id_telefono, numero)} onSolicitarEliminar={() => solicitarEliminarContacto({ tipo: 'tel', id: telefono.id_telefono, label: telefono.numero })} eliminando={eliminandoId === `tel-${telefono.id_telefono}`} />
                    ))}
                  </ul>
                )}
                <AgregarInput id="nuevo_telefono_casa" label="Nuevo teléfono" placeholder="Ej.: +502 2222-3333…" onAgregar={agregarTelefono} />
              </section>

              <section className={styles.contactSection} aria-labelledby="contactos-correos-title">
                <h3 id="contactos-correos-title" className={styles.contactHeading}><Mail size={16} aria-hidden="true" />Correos electrónicos</h3>
                {correos.length === 0 ? <p className={styles.contactEmpty}>Sin correos registrados.</p> : (
                  <ul className={styles.contactList}>
                    {correos.map((correo) => (
                      <ContactoItem key={correo.id_email} label={correo.correo} type="email" onActualizar={(valor) => actualizarCorreo(correo.id_email, valor)} onSolicitarEliminar={() => solicitarEliminarContacto({ tipo: 'cor', id: correo.id_email, label: correo.correo })} eliminando={eliminandoId === `cor-${correo.id_email}`} />
                    ))}
                  </ul>
                )}
                <AgregarInput id="nuevo_correo_casa" label="Nuevo correo electrónico" placeholder="Ej.: contacto@laboratorio.com…" type="email" onAgregar={agregarCorreo} />
              </section>

              <section className={styles.contactSection} aria-labelledby="contactos-proveedores-title">
                <h3 id="contactos-proveedores-title" className={styles.contactHeading}><Truck size={16} aria-hidden="true" />Proveedores asociados</h3>
                {proveedores.length === 0 ? <p className={styles.contactEmpty}>No hay proveedores vinculados a esta casa farmacéutica.</p> : (
                  <ul className={styles.contactList}>
                    {proveedores.map((proveedor) => (
                      <li key={proveedor.id_proveedor} className={styles.contactItem}>
                        <span className={styles.contactValue}>{proveedor.nombre}</span>
                        <span className={`${styles.badge} ${proveedor.activo ? styles.badgeActive : styles.badgeInactive}`}>{proveedor.activo ? 'Activo' : 'Inactivo'}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className={styles.helpText}>La vinculación se gestiona desde el módulo de Proveedores.</p>
              </section>
            </div>
          )}

          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} className={styles.button}>Cerrar</button>
          </div>
        </div>
      </AccessibleDialog>

      <AccessibleDialog open={Boolean(contactoAEliminar)} labelledBy="titulo-eliminar-contacto-casa" onClose={() => { if (!eliminandoId) setContactoAEliminar(null); }} busy={Boolean(eliminandoId)} size="small">
        <div className={styles.dialogContent}>
          <header className={styles.dialogHeader}>
            <div>
              <h2 id="titulo-eliminar-contacto-casa">Eliminar contacto</h2>
              <p>Esta acción no se puede deshacer.</p>
            </div>
          </header>
          <div className={styles.form}>
            <p>¿Deseas eliminar <strong>{contactoAEliminar?.label}</strong>?</p>
            {errorEliminacion && <p role="alert" className={styles.fieldError}>{errorEliminacion}</p>}
            <div className={styles.dialogActions}>
              <button type="button" onClick={() => setContactoAEliminar(null)} disabled={Boolean(eliminandoId)} className={styles.button}>Cancelar</button>
              <button type="button" onClick={confirmarEliminarContacto} disabled={Boolean(eliminandoId)} className={`${styles.button} ${styles.dangerPrimary}`}>
                {eliminandoId && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
                Eliminar contacto
              </button>
            </div>
          </div>
        </div>
      </AccessibleDialog>
    </>
  );
}
