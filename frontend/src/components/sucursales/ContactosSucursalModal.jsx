import { useToast } from '../../context/ToastContext.jsx';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Check, Pencil, X, Phone, Mail, Plus, Trash2 } from 'lucide-react';
import useContactosSucursal from '../../hooks/useContactosSucursal';

function ContactoItem({ label, type = 'text', onActualizar, onEliminar, eliminando }) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(label);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cancelarEdicion = () => {
    setValor(label);
    setEditando(false);
    setError('');
  };

  const guardarEdicion = async (event) => {
    event.preventDefault();
    if (!valor.trim() || valor.trim() === label) {
      cancelarEdicion();
      return;
    }

    setGuardando(true);
    setError('');
    try {
      await onActualizar(valor.trim());
      toast.success('Contacto actualizado correctamente.');
      setEditando(false);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo actualizar');
    } finally {
      setGuardando(false);
    }
  };

  if (editando) {
    return (
      <li className="py-1.5">
        <form onSubmit={guardarEdicion} className="flex items-center gap-2">
          <input
            type={type}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={guardando || !valor.trim()}
            className="text-green-600 hover:text-green-700 disabled:opacity-40"
            aria-label="Guardar contacto"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={cancelarEdicion}
            disabled={guardando}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
            aria-label="Cancelar edicion"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <span className="min-w-0 flex-1 break-words text-sm text-slate-700">{label}</span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setEditando(true)}
          disabled={eliminando}
          className="text-primary hover:text-primary/80 disabled:opacity-40"
          aria-label="Editar contacto"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onEliminar}
          disabled={eliminando}
          className="text-red-500 hover:text-red-700 disabled:opacity-40"
          aria-label="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

function AgregarInput({ placeholder, type = 'text', onAgregar }) {
  const toast = useToast();
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valor.trim()) return;
    setError('');
    setGuardando(true);
    try {
      await onAgregar(valor.trim());
      toast.success('Contacto agregado correctamente.');
      setValor('');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo agregar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-2 space-y-1">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type={type}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
        />
        <button
          type="submit"
          disabled={guardando || !valor.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-60"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function ContactosSucursalModal({ isOpen, sucursal, onClose }) {
  const toast = useToast();
  const [eliminandoId, setEliminandoId] = useState(null);
  const {
    telefonos, correos, cargando, error,
    agregarTelefono, actualizarTelefono, eliminarTelefono,
    agregarCorreo, actualizarCorreo, eliminarCorreo,
  } = useContactosSucursal(isOpen ? sucursal?.id_sucursal : null);

  if (!isOpen || !sucursal || typeof document === 'undefined') return null;

  const handleEliminarTelefono = async (id) => {
    setEliminandoId(`tel-${id}`);
    try { await eliminarTelefono(id); toast.success('Contacto eliminado correctamente.'); } catch (errorOperacion) { toast.error(errorOperacion.response?.data?.mensaje || 'No se pudo eliminar el contacto.'); } finally { setEliminandoId(null); }
  };

  const handleEliminarCorreo = async (id) => {
    setEliminandoId(`cor-${id}`);
    try { await eliminarCorreo(id); toast.success('Contacto eliminado correctamente.'); } catch (errorOperacion) { toast.error(errorOperacion.response?.data?.mensaje || 'No se pudo eliminar el contacto.'); } finally { setEliminandoId(null); }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-headline font-extrabold text-primary">
            Contactos — {sucursal.nombre_sucursal}
          </h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {cargando && <p className="text-sm text-slate-500">Cargando contactos...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-slate-700">Teléfonos</h4>
            </div>
            {!cargando && telefonos.length === 0 && (
              <p className="text-xs text-slate-400">Sin teléfonos registrados.</p>
            )}
            <ul className="divide-y divide-slate-100">
              {telefonos.map((t) => (
                <ContactoItem
                  key={t.id_telefono_sucursal}
                  label={t.numero}
                  onActualizar={(numero) => actualizarTelefono(t.id_telefono_sucursal, numero)}
                  onEliminar={() => handleEliminarTelefono(t.id_telefono_sucursal)}
                  eliminando={eliminandoId === `tel-${t.id_telefono_sucursal}`}
                />
              ))}
            </ul>
            <AgregarInput placeholder="Ej: +502 1234-5678" onAgregar={agregarTelefono} />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-slate-700">Correos electrónicos</h4>
            </div>
            {!cargando && correos.length === 0 && (
              <p className="text-xs text-slate-400">Sin correos registrados.</p>
            )}
            <ul className="divide-y divide-slate-100">
              {correos.map((c) => (
                <ContactoItem
                  key={c.id_correo_sucursal}
                  label={c.correo}
                  type="email"
                  onActualizar={(correo) => actualizarCorreo(c.id_correo_sucursal, correo)}
                  onEliminar={() => handleEliminarCorreo(c.id_correo_sucursal)}
                  eliminando={eliminandoId === `cor-${c.id_correo_sucursal}`}
                />
              ))}
            </ul>
            <AgregarInput placeholder="Ej: sucursal@farma.com" type="email" onAgregar={agregarCorreo} />
          </section>
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
