import { useToast } from '../../context/ToastContext.jsx';
import React, { useState } from 'react';
import { Check, Contact, LoaderCircle, Mail, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import useContactosCliente from '../../hooks/useContactosCliente';
import AccessibleDialog from '../ui/AccessibleDialog.jsx';
import styles from './ClienteDetailsModal.module.css';

// El backend guarda el número normalizado (solo dígitos y + opcional).
export const formatearTelefono = (numero) => {
  const texto = String(numero ?? '');
  const local = /^(\d{4})(\d{4})$/.exec(texto);
  if (local) return `${local[1]}-${local[2]}`;
  const guatemala = /^\+502(\d{4})(\d{4})$/.exec(texto);
  if (guatemala) return `+502 ${guatemala[1]}-${guatemala[2]}`;
  return texto;
};

const mensajeDeError = (err, alternativo) => (
  err.response?.data?.errores?.[0]?.msg || err.response?.data?.mensaje || alternativo
);

function ContactoItem({ etiqueta, descripcion, type, onActualizar, onEliminar }) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [valor, setValor] = useState(etiqueta);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const cancelarEdicion = () => {
    setValor(etiqueta);
    setEditando(false);
    setError('');
  };

  const guardarEdicion = async (evento) => {
    evento.preventDefault();
    const limpio = valor.trim();
    if (!limpio || limpio === etiqueta) {
      cancelarEdicion();
      return;
    }

    setProcesando(true);
    setError('');
    try {
      await onActualizar(limpio);
      toast.success('Contacto actualizado correctamente.');
      setEditando(false);
    } catch (err) {
      if (err.response?.data?.errores?.length) setError(mensajeDeError(err, 'No se pudo actualizar'));
      else toast.error(mensajeDeError(err, 'No se pudo actualizar'));
    } finally {
      setProcesando(false);
    }
  };

  const eliminar = async () => {
    setProcesando(true);
    setError('');
    try {
      await onEliminar();
      toast.success('Contacto eliminado correctamente.');
    } catch (err) {
      if (err.response?.data?.errores?.length) setError(mensajeDeError(err, 'No se pudo eliminar'));
      else toast.error(mensajeDeError(err, 'No se pudo eliminar'));
      setProcesando(false);
      setConfirmando(false);
    }
  };

  if (editando) {
    return (
      <li className={styles.contactItem}>
        <form onSubmit={guardarEdicion} className={styles.editForm}>
          <input
            type={type}
            name={`editar_${descripcion}`}
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
            aria-label={`Editar ${descripcion} ${etiqueta}`}
            autoComplete={type === 'tel' ? 'tel' : 'email'}
            spellCheck={type === 'email' ? 'false' : undefined}
            autoFocus
            className={styles.input}
          />
          <button type="submit" disabled={procesando || !valor.trim()} className={styles.iconButton} aria-label={`Guardar ${descripcion}`}>
            {procesando ? <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          </button>
          <button type="button" onClick={cancelarEdicion} disabled={procesando} className={styles.iconButton} aria-label="Cancelar edición">
            <X size={16} aria-hidden="true" />
          </button>
        </form>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </li>
    );
  }

  return (
    <li className={styles.contactItem}>
      <div className={styles.contactRow}>
        <span className={styles.contactValue}>{etiqueta}</span>
        {confirmando ? (
          <div className={styles.itemActions} aria-label={`Confirmar eliminación de ${descripcion}`}>
            <button type="button" onClick={() => setConfirmando(false)} disabled={procesando} className={styles.button}>Cancelar</button>
            <button type="button" onClick={eliminar} disabled={procesando} className={styles.dangerButton} aria-label={`Confirmar eliminar ${descripcion} ${etiqueta}`}>
              {procesando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              Eliminar
            </button>
          </div>
        ) : (
          <div className={styles.itemActions}>
            <button type="button" onClick={() => setEditando(true)} disabled={procesando} className={styles.iconButton} aria-label={`Editar ${descripcion} ${etiqueta}`}>
              <Pencil size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setConfirmando(true)} disabled={procesando} className={styles.iconButton} aria-label={`Eliminar ${descripcion} ${etiqueta}`}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </li>
  );
}

function AgregarContacto({ etiqueta, placeholder, type, onAgregar }) {
  const toast = useToast();
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const agregar = async (evento) => {
    evento.preventDefault();
    const limpio = valor.trim();
    if (!limpio) return;

    setGuardando(true);
    setError('');
    try {
      await onAgregar(limpio);
      toast.success('Contacto agregado correctamente.');
      setValor('');
    } catch (err) {
      if (err.response?.data?.errores?.length) setError(mensajeDeError(err, 'No se pudo agregar'));
      else toast.error(mensajeDeError(err, 'No se pudo agregar'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={styles.addBox}>
      <label className={styles.addLabel} htmlFor={`nuevo-${type}`}>{etiqueta}</label>
      <form onSubmit={agregar} className={styles.addForm}>
        <input
          id={`nuevo-${type}`}
          name={`nuevo_${type}`}
          type={type}
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          placeholder={placeholder}
          autoComplete={type === 'tel' ? 'tel' : 'email'}
          spellCheck={type === 'email' ? 'false' : undefined}
          className={styles.input}
        />
        <button type="submit" disabled={guardando || !valor.trim()} className={styles.primaryButton}>
          {guardando ? <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
          Agregar
        </button>
      </form>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  );
}

function SeccionContactos({ titulo, descripcion, icono: Icono, vacio, cargando, children }) {
  const tituloId = `contactos-${titulo.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section className={styles.contactSection} aria-labelledby={tituloId}>
      <div className={styles.sectionHeading}>
        <span className={styles.sectionIcon}><Icono size={17} aria-hidden="true" /></span>
        <div><h3 id={tituloId}>{titulo}</h3><p>{descripcion}</p></div>
      </div>
      {!cargando && vacio}
      {children}
    </section>
  );
}

export default function ClienteContactosModal({ cliente, onClose }) {
  const {
    telefonos,
    correos,
    cargando,
    error,
    agregarTelefono,
    actualizarTelefono,
    eliminarTelefono,
    agregarCorreo,
    actualizarCorreo,
    eliminarCorreo,
  } = useContactosCliente(cliente?.id_cliente ?? null);

  return (
    <AccessibleDialog
      open={Boolean(cliente)}
      labelledBy="titulo-contactos-cliente"
      describedBy="descripcion-contactos-cliente"
      onClose={onClose}
      size="large"
      className={styles.contactDialog}
    >
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <span className={styles.headingIcon}><Contact size={20} aria-hidden="true" /></span>
            <div>
              <p className={styles.eyebrow}>Directorio del cliente</p>
              <h2 id="titulo-contactos-cliente">Contactos</h2>
              <p id="descripcion-contactos-cliente" className={styles.subtitle}>{cliente?.nombre_cliente}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.iconButton} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
        </header>

        <div className={styles.content}>
          {cargando && <div role="status" className={styles.state}><LoaderCircle size={24} className={styles.spinner} aria-hidden="true" /><span>Cargando contactos…</span></div>}
          {error && <div role="alert" className={`${styles.state} ${styles.stateError}`}>{error}</div>}

          {!cargando && !error && (
            <div className={styles.contactGrid}>
              <SeccionContactos titulo="Teléfonos" descripcion="Llamadas y mensajería" icono={Phone} cargando={cargando} vacio={telefonos.length === 0 && <p className={styles.emptyContact}>Sin teléfonos registrados.</p>}>
                <ul className={styles.contactList}>
                  {telefonos.map((telefono) => (
                    <ContactoItem key={telefono.id_telefono} etiqueta={formatearTelefono(telefono.numero)} descripcion="teléfono" type="tel" onActualizar={(numero) => actualizarTelefono(telefono.id_telefono, numero)} onEliminar={() => eliminarTelefono(telefono.id_telefono)} />
                  ))}
                </ul>
                <AgregarContacto etiqueta="Nuevo teléfono" placeholder="Ej.: 5555-1234…" type="tel" onAgregar={agregarTelefono} />
              </SeccionContactos>

              <SeccionContactos titulo="Correos electrónicos" descripcion="Notificaciones y comprobantes" icono={Mail} cargando={cargando} vacio={correos.length === 0 && <p className={styles.emptyContact}>Sin correos registrados.</p>}>
                <ul className={styles.contactList}>
                  {correos.map((correo) => (
                    <ContactoItem key={correo.id_email} etiqueta={correo.correo} descripcion="correo" type="email" onActualizar={(valor) => actualizarCorreo(correo.id_email, valor)} onEliminar={() => eliminarCorreo(correo.id_email)} />
                  ))}
                </ul>
                <AgregarContacto etiqueta="Nuevo correo" placeholder="Ej.: cliente@correo.com…" type="email" onAgregar={agregarCorreo} />
              </SeccionContactos>
            </div>
          )}
        </div>

        <footer className={styles.footer}><button type="button" onClick={onClose} className={styles.button}>Cerrar</button></footer>
      </div>
    </AccessibleDialog>
  );
}
