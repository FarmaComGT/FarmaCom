import React, { useMemo, useState } from 'react';
import { ChevronDown, Search, User, UserCheck, X } from 'lucide-react';

export default function ClienteSelectorPOS({ clientes, cargando, clienteSeleccionado, onSeleccionar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (!termino) return clientes;
    return clientes.filter((cliente) =>
      cliente.nombre_cliente.toLocaleLowerCase('es').includes(termino));
  }, [busqueda, clientes]);

  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
  };

  const seleccionar = (cliente) => {
    onSeleccionar(cliente);
    cerrar();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-on-surface transition-colors hover:border-primary/40"
      >
        <span className="flex min-w-0 items-center gap-2">
          {clienteSeleccionado ? (
            <UserCheck className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <User className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <span className="truncate">
            {clienteSeleccionado ? clienteSeleccionado.nombre_cliente : 'Consumidor final'}
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {clienteSeleccionado && (
            <span
              role="button"
              tabIndex={0}
              onClick={(evento) => {
                evento.stopPropagation();
                onSeleccionar(null);
              }}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') {
                  evento.stopPropagation();
                  onSeleccionar(null);
                }
              }}
              aria-label="Quitar cliente seleccionado"
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-error"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {abierto && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar cliente..."
              aria-label="Buscar cliente"
              className="w-full rounded-lg border-none bg-slate-50 py-2 pl-9 pr-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => seleccionar(null)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-primary/5 hover:text-primary"
            >
              <User className="h-4 w-4 shrink-0" />
              Consumidor final
            </button>

            {cargando && (
              <p className="px-4 py-3 text-sm text-slate-400">Cargando clientes...</p>
            )}

            {!cargando && clientesFiltrados.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">No se encontraron clientes.</p>
            )}

            {!cargando && clientesFiltrados.map((cliente) => (
              <button
                key={cliente.id_cliente}
                type="button"
                onClick={() => seleccionar(cliente)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-on-surface hover:bg-primary/5 hover:text-primary"
              >
                <UserCheck className="h-4 w-4 shrink-0 text-primary/60" />
                {cliente.nombre_cliente}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
