import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Check, Contact, Mail, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import useContactosCliente from '../../hooks/useContactosCliente';

// El backend guarda el número normalizado (solo dígitos y + opcional).
export const formatearTelefono = (numero) => {
  const texto = String(numero ?? '');
  const local = /^(\d{4})(\d{4})$/.exec(texto);
  if (local) return `${local[1]}-${local[2]}`;
  const guatemala = /^\+502(\d{4})(\d{4})$/.exec(texto);
  if (guatemala) return `+502 ${guatemala[1]}-${guatemala[2]}`;
  return texto;
};

// Los errores de validación traen el detalle en `errores`; los demás en `mensaje`.
const mensajeDeError = (err, alternativo) => (
  err.response?.data?.errores?.[0]?.msg || err.response?.data?.mensaje || alternativo
);

function ContactoItem({ etiqueta, descripcion, type, onActualizar, onEliminar }) {
  const [editando, setEditando] = useState(false);
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
      setEditando(false);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo actualizar'));
    } finally {
      setProcesando(false);
    }
  };

  const eliminar = async () => {
    setProcesando(true);
    setError('');
    try {
      await onEliminar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo eliminar'));
      setProcesando(false);
    }
  };

  if (editando) {
    return (
      <li className="py-1.5">
        <form onSubmit={guardarEdicion} className="flex items-center gap-2">
          <input
            type={type}
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
            aria-label={`Editar ${descripcion} ${etiqueta}`}
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={procesando || !valor.trim()}
            className="rounded p-1 text-green-600 hover:text-green-700 disabled:opacity-40"
            aria-label={`Guardar ${descripcion}`}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={cancelarEdicion}
            disabled={procesando}
            className="rounded p-1 text-slate-400 hover:text-slate-600 disabled:opacity-40"
            aria-label="Cancelar edición"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
        {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      </li>
    );
  }

  return (
    <li className="py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 break-words text-sm text-slate-700">{etiqueta}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditando(true)}
            disabled={procesando}
            className="rounded p-1 text-primary hover:text-primary/80 disabled:opacity-40"
            aria-label={`Editar ${descripcion} ${etiqueta}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={eliminar}
            disabled={procesando}
            className="rounded p-1 text-red-500 hover:text-red-700 disabled:opacity-40"
            aria-label={`Eliminar ${descripcion} ${etiqueta}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

function AgregarContacto({ etiqueta, placeholder, type, onAgregar }) {
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
      setValor('');
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo agregar'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-2 space-y-1">
      <form onSubmit={agregar} className="flex gap-2">
        <input
          type={type}
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          placeholder={placeholder}
          aria-label={etiqueta}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={guardando || !valor.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {guardando ? 'Agregando...' : 'Agregar'}
        </button>
      </form>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SeccionContactos({ titulo, icono: Icono, vacio, cargando, children }) {
  return (
    <section aria-label={titulo}>
      <div className="mb-2 flex items-center gap-2">
        <Icono className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-bold text-slate-700">{titulo}</h4>
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

  if (!cliente || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-contactos-cliente"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Contact className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3
                id="titulo-contactos-cliente"
                className="truncate font-headline text-lg font-extrabold text-primary"
              >
                Contactos
              </h3>
              <p className="truncate text-sm font-medium text-slate-500">{cliente.nombre_cliente}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {cargando && <p className="text-sm text-slate-500">Cargando contactos...</p>}
          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

          <SeccionContactos
            titulo="Teléfonos"
            icono={Phone}
            cargando={cargando}
            vacio={telefonos.length === 0 && (
              <p className="text-xs text-slate-400">Sin teléfonos registrados.</p>
            )}
          >
            <ul className="divide-y divide-slate-100">
              {telefonos.map((telefono) => (
                <ContactoItem
                  key={telefono.id_telefono}
                  etiqueta={formatearTelefono(telefono.numero)}
                  descripcion="teléfono"
                  type="tel"
                  onActualizar={(numero) => actualizarTelefono(telefono.id_telefono, numero)}
                  onEliminar={() => eliminarTelefono(telefono.id_telefono)}
                />
              ))}
            </ul>
            <AgregarContacto
              etiqueta="Nuevo teléfono"
              placeholder="Ej: 5555-1234 o +502 5555-1234"
              type="tel"
              onAgregar={agregarTelefono}
            />
          </SeccionContactos>

          <SeccionContactos
            titulo="Correos electrónicos"
            icono={Mail}
            cargando={cargando}
            vacio={correos.length === 0 && (
              <p className="text-xs text-slate-400">Sin correos registrados.</p>
            )}
          >
            <ul className="divide-y divide-slate-100">
              {correos.map((correo) => (
                <ContactoItem
                  key={correo.id_email}
                  etiqueta={correo.correo}
                  descripcion="correo"
                  type="email"
                  onActualizar={(valor) => actualizarCorreo(correo.id_email, valor)}
                  onEliminar={() => eliminarCorreo(correo.id_email)}
                />
              ))}
            </ul>
            <AgregarContacto
              etiqueta="Nuevo correo"
              placeholder="Ej: cliente@correo.com"
              type="email"
              onAgregar={agregarCorreo}
            />
          </SeccionContactos>
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
