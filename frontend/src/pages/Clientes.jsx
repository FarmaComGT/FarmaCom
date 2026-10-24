import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Contact,
  History,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import ClienteContactosModal from '../components/clientes/ClienteContactosModal';
import HistorialClienteModal from '../components/clientes/HistorialClienteModal';
import useClientes from '../hooks/useClientes';
import { esNitValido, MENSAJE_NIT_INVALIDO, normalizarNit } from '../utils/nit';

const inicial = { nombre_cliente: '', nit: '', observaciones: '' };

function Modal({ children, onClose, disabled = false }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex justify-end px-4 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            aria-label="Cerrar"
            className="text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default function Clientes() {
  const { clientes, cargando, error, crear, actualizar, eliminar } = useClientes();
  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState(inicial);
  const [editando, setEditando] = useState(null);
  const [eliminarCliente, setEliminarCliente] = useState(null);
  const [clienteHistorial, setClienteHistorial] = useState(null);
  const [clienteContactos, setClienteContactos] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return !texto
      ? clientes
      : clientes.filter((cliente) => (
        `${cliente.nombre_cliente} ${cliente.nit || ''} ${cliente.observaciones || ''}`
          .toLowerCase()
          .includes(texto)
      ));
  }, [busqueda, clientes]);

  const abrirNuevo = () => {
    setEditando({ nuevo: true });
    setFormulario(inicial);
    setErrorFormulario(null);
  };

  const abrirEditar = (cliente) => {
    setEditando(cliente);
    setFormulario({
      nombre_cliente: cliente.nombre_cliente,
      nit: cliente.nit || '',
      observaciones: cliente.observaciones || '',
    });
    setErrorFormulario(null);
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    const nombreCliente = formulario.nombre_cliente.trim();

    if (!nombreCliente) {
      setErrorFormulario('El nombre del cliente es requerido.');
      return;
    }

    if (!esNitValido(formulario.nit)) {
      setErrorFormulario(MENSAJE_NIT_INVALIDO);
      return;
    }

    try {
      setGuardando(true);
      setErrorFormulario(null);
      const datos = {
        nombre_cliente: nombreCliente,
        nit: normalizarNit(formulario.nit) || null,
        observaciones: formulario.observaciones.trim() || null,
      };

      if (editando.nuevo) await crear(datos);
      else await actualizar(editando.id_cliente, datos);
      setEditando(null);
    } catch (err) {
      setErrorFormulario(err.response?.data?.mensaje || 'No se pudo guardar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    try {
      setBorrando(true);
      setErrorAccion(null);
      await eliminar(eliminarCliente.id_cliente);
      setEliminarCliente(null);
    } catch (err) {
      setErrorAccion(err.response?.data?.mensaje || 'No se pudo eliminar el cliente.');
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-surface-container-low/70 px-5 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-headline text-xl font-extrabold text-primary">Clientes</h1>
              <p className="text-sm font-medium text-slate-500">{clientes.length} registrados</p>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirNuevo}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-headline text-sm font-bold text-white md:w-auto"
          >
            <PlusCircle className="h-4 w-4" />
            Nuevo cliente
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-container-low p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre, NIT u observaciones..."
            className="w-full rounded-xl border-none bg-surface-container-lowest py-3 pl-12 pr-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {(error || errorAccion) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error || errorAccion}
        </div>
      )}

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-surface-container-low/60">
        <div className="min-w-[950px]">
          <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-surface-container-low px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="col-span-1">#</span>
            <span className="col-span-3">Nombre</span>
            <span className="col-span-2">NIT</span>
            <span className="col-span-2">Observaciones</span>
            <span className="col-span-4 text-center">Acciones</span>
          </div>

          {cargando ? (
            <div className="px-5 py-10 text-center text-slate-500">Cargando clientes...</div>
          ) : filtrados.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500">
              No hay clientes para mostrar.
            </div>
          ) : (
            filtrados.map((cliente) => (
              <div
                key={cliente.id_cliente}
                className="grid grid-cols-12 items-center gap-4 border-b border-slate-200 bg-white/60 px-5 py-4 last:border-0"
              >
                <span className="col-span-1 font-mono text-sm text-slate-400">
                  {cliente.id_cliente}
                </span>
                <span className="col-span-3 font-semibold text-primary">
                  {cliente.nombre_cliente}
                </span>
                <span className="col-span-2 font-mono text-sm font-semibold text-slate-600">
                  {cliente.nit || '—'}
                </span>
                <span
                  className="col-span-2 truncate text-sm text-slate-600"
                  title={cliente.observaciones || ''}
                >
                  {cliente.observaciones || '—'}
                </span>
                <div className="col-span-4 mx-auto grid w-full max-w-64 grid-cols-2 gap-2 [&>button]:justify-center">
                  <button
                    type="button"
                    onClick={() => setClienteContactos(cliente)}
                    aria-label={`Ver contactos de ${cliente.nombre_cliente}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/20 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                  >
                    <Contact className="h-3.5 w-3.5" />
                    Contactos
                  </button>
                  <button
                    type="button"
                    onClick={() => setClienteHistorial(cliente)}
                    aria-label={`Ver historial de ${cliente.nombre_cliente}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-secondary/20 px-3 py-2 text-xs font-bold text-secondary transition-colors hover:bg-secondary/10"
                  >
                    <History className="h-3.5 w-3.5" />
                    Historial
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirEditar(cliente)}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/20 px-3 py-2 text-xs font-bold text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEliminarCliente(cliente)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {editando && (
        <Modal onClose={() => !guardando && setEditando(null)} disabled={guardando}>
          <form onSubmit={guardar} className="space-y-4 px-6 pb-6">
            <h2 className="font-headline text-lg font-extrabold text-primary">
              {editando.nuevo ? 'Nuevo cliente' : 'Editar cliente'}
            </h2>
            <div>
              <label htmlFor="nombre-cliente" className="text-sm font-semibold text-slate-700">
                Nombre completo
              </label>
              <input
                id="nombre-cliente"
                name="nombre_cliente"
                value={formulario.nombre_cliente}
                onChange={(evento) => setFormulario({
                  ...formulario,
                  [evento.target.name]: evento.target.value,
                })}
                required
                maxLength={150}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="nit-cliente" className="text-sm font-semibold text-slate-700">
                NIT <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                id="nit-cliente"
                name="nit"
                value={formulario.nit}
                onChange={(evento) => setFormulario({
                  ...formulario,
                  [evento.target.name]: evento.target.value,
                })}
                maxLength={20}
                autoCapitalize="characters"
                placeholder="Ej. 1234567-K"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-sm uppercase"
              />
            </div>
            <div>
              <label
                htmlFor="observaciones-cliente"
                className="text-sm font-semibold text-slate-700"
              >
                Observaciones (opcional)
              </label>
              <textarea
                id="observaciones-cliente"
                name="observaciones"
                value={formulario.observaciones}
                onChange={(evento) => setFormulario({
                  ...formulario,
                  [evento.target.name]: evento.target.value,
                })}
                maxLength={2000}
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
              />
            </div>
            {errorFormulario && (
              <p className="text-sm font-semibold text-red-600">{errorFormulario}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {eliminarCliente && (
        <Modal onClose={() => !borrando && setEliminarCliente(null)} disabled={borrando}>
          <div className="space-y-4 px-6 pb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="font-headline text-lg font-extrabold text-primary">
                Confirmar eliminación
              </h2>
            </div>
            <p className="text-sm text-slate-700">
              ¿Eliminar a <span className="font-bold">{eliminarCliente.nombre_cliente}</span>?
              {' '}Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEliminarCliente(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={borrando}
                onClick={confirmarEliminar}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white"
              >
                {borrando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <HistorialClienteModal
        cliente={clienteHistorial}
        onClose={() => setClienteHistorial(null)}
      />

      <ClienteContactosModal
        cliente={clienteContactos}
        onClose={() => setClienteContactos(null)}
      />
    </div>
  );
}
