import React, { useEffect, useMemo, useState } from 'react';
import {
  Contact,
  History,
  LoaderCircle,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ClienteContactosModal from '../components/clientes/ClienteContactosModal';
import HistorialClienteModal from '../components/clientes/HistorialClienteModal';
import AccessibleDialog from '../components/ui/AccessibleDialog.jsx';
import useClientes from '../hooks/useClientes';
import { esNitValido, MENSAJE_NIT_INVALIDO, normalizarNit } from '../utils/nit';
import styles from '../styles/ManagementUI.module.css';

const inicial = { nombre_cliente: '', nit: '', observaciones: '' };

export default function Clientes() {
  const { clientes, cargando, error, crear, actualizar, eliminar } = useClientes();
  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get('q') || '';
  const [formulario, setFormulario] = useState(inicial);
  const [editando, setEditando] = useState(null);
  const [eliminarCliente, setEliminarCliente] = useState(null);
  const [clienteHistorial, setClienteHistorial] = useState(null);
  const [clienteContactos, setClienteContactos] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const errorFormularioRef = React.useRef(null);

  useEffect(() => {
    document.title = 'Clientes · FarmaCom';
  }, []);

  useEffect(() => {
    if (errorFormulario) errorFormularioRef.current?.focus();
  }, [errorFormulario]);

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

  const actualizarBusqueda = (valor) => {
    setSearchParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (valor) siguientes.set('q', valor);
      else siguientes.delete('q');
      return siguientes;
    }, { replace: true });
  };

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
    if (nombreCliente.length > 150) {
      setErrorFormulario('El nombre del cliente no puede superar los 150 caracteres.');
      return;
    }
    if (formulario.observaciones.trim().length > 2000) {
      setErrorFormulario('Las observaciones no pueden superar los 2000 caracteres.');
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
    if (!eliminarCliente) return;
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

  const tituloFormularioId = 'cliente-form-title';
  const tituloEliminarId = 'cliente-delete-title';

  return (
    <section className={styles.page} aria-labelledby="clientes-title">
      <header className={styles.heading}>
        <div>
          <h1 id="clientes-title">Clientes</h1>
          <p>Consulta datos fiscales, contactos e historial de compras.</p>
        </div>
      </header>

      <div className={styles.summary} aria-label="Resumen de clientes">
        <div className={styles.stat}><strong>{clientes.length}</strong><span>Clientes registrados</span></div>
        <div className={styles.stat}><strong>{filtrados.length}</strong><span>Resultados visibles</span></div>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Buscar clientes</span>
          <input
            type="search"
            name="q"
            autoComplete="off"
            value={busqueda}
            onChange={(evento) => actualizarBusqueda(evento.target.value)}
            placeholder="Buscar por nombre, NIT u observaciones…"
          />
        </label>
        <button type="button" onClick={abrirNuevo} className={`${styles.button} ${styles.primary}`}>
          <PlusCircle size={16} aria-hidden="true" /> Nuevo cliente
        </button>
      </div>

      <p className={styles.resultCount} aria-live="polite"><strong>{filtrados.length}</strong> de {clientes.length} clientes</p>

      {(error || errorAccion) && <div className={styles.alert} role="alert">{error || errorAccion}</div>}

      <section className={styles.tablePanel} aria-label="Clientes registrados">
        <table className={styles.table} aria-busy={cargando}>
          <thead>
            <tr>
              <th scope="col" style={{ width: '8%' }}>ID</th>
              <th scope="col" style={{ width: '22%' }}>Nombre</th>
              <th scope="col" style={{ width: '14%' }}>NIT</th>
              <th scope="col" style={{ width: '24%' }}>Observaciones</th>
              <th scope="col" style={{ width: '32%', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="5" className={styles.loading}>Cargando clientes…</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="5" className={styles.empty}><strong>No hay clientes para mostrar.</strong><span>Prueba con otra búsqueda o registra un cliente.</span></td></tr>
            ) : filtrados.map((cliente) => (
              <tr key={cliente.id_cliente}>
                <td data-label="ID" className={`${styles.secondary} ${styles.mono}`}>{cliente.id_cliente}</td>
                <td data-label="Nombre"><span className={styles.identity}>{cliente.nombre_cliente}</span></td>
                <td data-label="NIT" className={styles.mono}>{cliente.nit || '—'}</td>
                <td data-label="Observaciones" className={styles.secondary}>{cliente.observaciones || '—'}</td>
                <td data-label="Acciones" className={styles.actionsCell}>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => setClienteContactos(cliente)} aria-label={`Ver contactos de ${cliente.nombre_cliente}`} className={styles.button}><Contact size={14} aria-hidden="true" /> Contactos</button>
                    <button type="button" onClick={() => setClienteHistorial(cliente)} aria-label={`Ver historial de ${cliente.nombre_cliente}`} className={styles.button}><History size={14} aria-hidden="true" /> Historial</button>
                    <button type="button" onClick={() => abrirEditar(cliente)} aria-label={`Editar a ${cliente.nombre_cliente}`} className={styles.button}><Pencil size={14} aria-hidden="true" /> Editar</button>
                    <button type="button" onClick={() => setEliminarCliente(cliente)} aria-label={`Eliminar a ${cliente.nombre_cliente}`} className={`${styles.button} ${styles.danger}`}><Trash2 size={14} aria-hidden="true" /> Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <AccessibleDialog open={Boolean(editando)} labelledBy={tituloFormularioId} onClose={() => !guardando && setEditando(null)} busy={guardando} size="medium">
        <div className={styles.dialogContent}>
          <header className={styles.dialogHeader}>
            <div>
              <h2 id={tituloFormularioId}>{editando?.nuevo ? 'Nuevo cliente' : 'Editar cliente'}</h2>
              <p>Los datos de contacto se administran después de guardar.</p>
            </div>
            <button type="button" onClick={() => setEditando(null)} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
          </header>

          <form onSubmit={guardar} noValidate className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="nombre-cliente">Nombre completo</label>
                <input
                  id="nombre-cliente"
                  name="nombre_cliente"
                  autoComplete="name"
                  value={formulario.nombre_cliente}
                  onChange={(evento) => setFormulario({ ...formulario, [evento.target.name]: evento.target.value })}
                  className={styles.input}
                  placeholder="Ej.: María López…"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="nit-cliente">NIT <span className={styles.optional}>(opcional)</span></label>
                <input
                  id="nit-cliente"
                  name="nit"
                  value={formulario.nit}
                  onChange={(evento) => setFormulario({ ...formulario, [evento.target.name]: evento.target.value })}
                  autoCapitalize="characters"
                  spellCheck="false"
                  placeholder="Ej.: 1234567-K…"
                  className={`${styles.input} ${styles.mono}`}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="observaciones-cliente">Observaciones <span className={styles.optional}>(opcional)</span></label>
              <textarea
                id="observaciones-cliente"
                name="observaciones"
                value={formulario.observaciones}
                onChange={(evento) => setFormulario({ ...formulario, [evento.target.name]: evento.target.value })}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') event.currentTarget.form?.requestSubmit();
                }}
                rows={4}
                className={styles.input}
                placeholder="Ej.: Prefiere contacto por teléfono…"
              />
            </div>
            {errorFormulario && <p ref={errorFormularioRef} tabIndex={-1} className={styles.fieldError} role="alert">{errorFormulario}</p>}
            <div className={styles.dialogActions}>
              <button type="button" onClick={() => setEditando(null)} disabled={guardando} className={styles.button}>Cancelar</button>
              <button type="submit" disabled={guardando} className={`${styles.button} ${styles.primary}`}>
                {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />} Guardar
              </button>
            </div>
          </form>
        </div>
      </AccessibleDialog>

      <AccessibleDialog open={Boolean(eliminarCliente)} labelledBy={tituloEliminarId} onClose={() => !borrando && setEliminarCliente(null)} busy={borrando} size="small">
        <div className={styles.dialogContent}>
          <header className={styles.dialogHeader}>
            <div>
              <h2 id={tituloEliminarId}>Confirmar eliminación</h2>
              <p>Esta acción no se puede deshacer.</p>
            </div>
            <button type="button" onClick={() => setEliminarCliente(null)} disabled={borrando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar"><X size={17} aria-hidden="true" /></button>
          </header>
          <p>¿Deseas eliminar a <strong>{eliminarCliente?.nombre_cliente}</strong>?</p>
          <div className={styles.dialogActions}>
            <button type="button" onClick={() => setEliminarCliente(null)} disabled={borrando} className={styles.button}>Cancelar</button>
            <button type="button" onClick={confirmarEliminar} disabled={borrando} className={`${styles.button} ${styles.dangerPrimary}`}>
              {borrando ? <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />} Sí, eliminar
            </button>
          </div>
        </div>
      </AccessibleDialog>

      <HistorialClienteModal cliente={clienteHistorial} onClose={() => setClienteHistorial(null)} />
      <ClienteContactosModal cliente={clienteContactos} onClose={() => setClienteContactos(null)} />
    </section>
  );
}
