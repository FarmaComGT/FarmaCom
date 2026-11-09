import React, { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, User, UserCheck, X } from 'lucide-react';
import { normalizarNit } from '../../utils/nit';
import styles from './ClienteSelectorPOS.module.css';

export default function ClienteSelectorPOS({ clientes, cargando, clienteSeleccionado, onSeleccionar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [consulta, setConsulta] = useState('');
  const trigger = useRef(null);
  const panelId = useId();
  const clientesFiltrados = useMemo(() => {
    if (!consulta) return [];
    const termino = consulta.toLocaleLowerCase('es');
    const nit = normalizarNit(consulta).replace(/-/g, '');
    return clientes.filter((cliente) =>
      (cliente.nombre_cliente ?? '').toLocaleLowerCase('es').includes(termino)
      || (nit && normalizarNit(cliente.nit).replace(/-/g, '').includes(nit)));
  }, [consulta, clientes]);

  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
    setConsulta('');
    trigger.current?.focus();
  };
  const seleccionar = (cliente) => { onSeleccionar(cliente); cerrar(); };

  return (
    <div className={styles.root} onKeyDown={(evento) => {
      if (evento.key === 'Escape' && abierto) { evento.stopPropagation(); cerrar(); }
    }} onBlur={(evento) => {
      if (!evento.currentTarget.contains(evento.relatedTarget)) {
        setAbierto(false); setBusqueda(''); setConsulta('');
      }
    }}>
      <div className={styles.control}>
        <button ref={trigger} type="button" aria-expanded={abierto} aria-controls={panelId}
          className={styles.trigger} onClick={() => abierto ? cerrar() : setAbierto(true)}>
          <User size={18} aria-hidden="true" />
          <span className={styles.identity}>
            <span className={styles.name}>{clienteSeleccionado?.nombre_cliente ?? 'Consumidor final'}</span>
            {clienteSeleccionado && <span className={styles.nit}>{clienteSeleccionado.nit ? `NIT ${clienteSeleccionado.nit}` : 'Sin NIT'}</span>}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {clienteSeleccionado && <button type="button" className={styles.clear} aria-label="Quitar cliente seleccionado" onClick={() => seleccionar(null)}><X size={16} aria-hidden="true" /></button>}
      </div>
      {abierto && <div id={panelId} className={styles.panel}>
        <form className={styles.form} onSubmit={(evento) => { evento.preventDefault(); setConsulta(busqueda.trim()); }}>
          <label htmlFor={`${panelId}-buscar`}>Buscar cliente por nombre o NIT</label>
          <div className={styles.search}>
            <input id={`${panelId}-buscar`} type="search" name="busqueda_cliente" autoComplete="off"
              autoFocus={typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px) and (pointer: fine)').matches}
              value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setConsulta(''); }}
              placeholder="Nombre o NIT…" />
            <button type="submit"><Search size={16} aria-hidden="true" /><span>Buscar</span></button>
          </div>
        </form>
        {consulta && <div className={styles.results}>
          {cargando ? <p role="status">Cargando clientes…</p> : <>
            <p role="status">{clientesFiltrados.length ? `${clientesFiltrados.length} ${clientesFiltrados.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}` : 'No se encontraron clientes. Prueba otro nombre o NIT.'}</p>
            {clientesFiltrados.slice(0, 50).map((cliente) => <button key={cliente.id_cliente} type="button" className={styles.result} onClick={() => seleccionar(cliente)}>
              <span className={styles.identity}><span className={styles.name}>{cliente.nombre_cliente}</span>{' '}<span className={styles.nit}>{cliente.nit ? `NIT ${cliente.nit}` : 'Sin NIT'}</span></span>
              <UserCheck size={16} aria-hidden="true" />
            </button>)}
            {clientesFiltrados.length > 50 && <p>Se muestran los primeros 50. Precisa el nombre o NIT.</p>}
          </>}
        </div>}
      </div>}
    </div>
  );
}
