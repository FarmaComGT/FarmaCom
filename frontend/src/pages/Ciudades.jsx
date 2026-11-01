import React, { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Pencil, PlusCircle, Search, Trash2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AccessibleDialog from '../components/ui/AccessibleDialog.jsx';
import SucursalAlert from '../components/sucursales/SucursalAlert.jsx';
import SucursalesSubNav from '../components/sucursales/SucursalesSubNav.jsx';
import useCiudades from '../hooks/useCiudades';
import styles from '../styles/ManagementUI.module.css';

const formularioInicial = { nombre_ciudad: '' };

function CiudadFormModal({
  isOpen,
  modoEdicion,
  formulario,
  guardando,
  errorFormulario,
  onClose,
  onSubmit,
  onChange,
}) {
  const tituloId = 'ciudad-form-title';
  const errorRef = React.useRef(null);
  React.useEffect(() => {
    if (errorFormulario) errorRef.current?.focus();
  }, [errorFormulario]);
  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} onClose={onClose} busy={guardando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>{modoEdicion ? 'Editar ciudad' : 'Nueva ciudad'}</h2>
            <p>Las ciudades se utilizan para organizar las sucursales.</p>
          </div>
          <button type="button" onClick={onClose} disabled={guardando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={onSubmit} noValidate className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="nombre_ciudad">Nombre</label>
            <input
              id="nombre_ciudad"
              type="text"
              name="nombre_ciudad"
              autoComplete="address-level2"
              value={formulario.nombre_ciudad}
              onChange={onChange}
              className={styles.input}
              placeholder="Ej.: Guatemala…"
            />
          </div>

          {errorFormulario && <p ref={errorRef} tabIndex={-1} className={styles.fieldError} role="alert">{errorFormulario}</p>}

          <div className={styles.dialogActions}>
            <button type="button" onClick={onClose} disabled={guardando} className={styles.button}>Cancelar</button>
            <button type="submit" disabled={guardando} className={`${styles.button} ${styles.primary}`}>
              {guardando && <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" />}
              {modoEdicion ? 'Guardar cambios' : 'Crear ciudad'}
            </button>
          </div>
        </form>
      </div>
    </AccessibleDialog>
  );
}

function CiudadDeleteModal({ isOpen, ciudad, eliminando, onClose, onConfirm }) {
  if (!ciudad) return null;
  const tituloId = 'ciudad-delete-title';
  const descripcionId = 'ciudad-delete-description';
  return (
    <AccessibleDialog open={isOpen} labelledBy={tituloId} describedBy={descripcionId} onClose={onClose} busy={eliminando} size="small">
      <div className={styles.dialogContent}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id={tituloId}>Confirmar eliminación</h2>
            <p>No podrá eliminarse si está asociada a una sucursal.</p>
          </div>
          <button type="button" onClick={onClose} disabled={eliminando} className={`${styles.button} ${styles.iconButton}`} aria-label="Cerrar">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <p id={descripcionId}>¿Deseas eliminar la ciudad <strong>{ciudad.nombre_ciudad}</strong>?</p>

        <div className={styles.dialogActions}>
          <button type="button" onClick={onClose} disabled={eliminando} className={styles.button}>Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={eliminando} className={`${styles.button} ${styles.dangerPrimary}`}>
            {eliminando ? <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
            Sí, eliminar
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}

export default function Ciudades() {
  const { ciudades, cargandoCiudades, errorCiudades, crear, actualizar, eliminar } = useCiudades();
  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get('q') || '';
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [ciudadAEliminar, setCiudadAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  useEffect(() => {
    document.title = 'Ciudades · FarmaCom';
  }, []);

  const ciudadesFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return ciudades;
    return ciudades.filter((ciudad) => ciudad.nombre_ciudad.toLowerCase().includes(termino));
  }, [busqueda, ciudades]);

  const actualizarBusqueda = (valor) => {
    setSearchParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (valor) siguientes.set('q', valor);
      else siguientes.delete('q');
      return siguientes;
    }, { replace: true });
  };

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setIdEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (ciudad) => {
    setModoEdicion(true);
    setIdEditando(ciudad.id_ciudad);
    setFormulario({ nombre_ciudad: ciudad.nombre_ciudad || '' });
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (!guardando) setMostrarModal(false);
  };

  const manejarGuardar = async (event) => {
    event.preventDefault();
    setErrorFormulario(null);
    const nombreCiudad = formulario.nombre_ciudad.trim();

    if (!nombreCiudad) {
      setErrorFormulario('El nombre de la ciudad es requerido.');
      return;
    }
    if (nombreCiudad.length > 100) {
      setErrorFormulario('El nombre de la ciudad no puede superar los 100 caracteres.');
      return;
    }

    try {
      setGuardando(true);
      if (modoEdicion && idEditando) await actualizar(idEditando, { nombre_ciudad: nombreCiudad });
      else await crear({ nombre_ciudad: nombreCiudad });
      setMostrarModal(false);
      setFormulario(formularioInicial);
    } catch (err) {
      setErrorFormulario(err.response?.data?.mensaje || 'No se pudo guardar la ciudad.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!ciudadAEliminar) return;
    try {
      setErrorAccion(null);
      setEliminandoId(ciudadAEliminar.id_ciudad);
      await eliminar(ciudadAEliminar.id_ciudad);
      setCiudadAEliminar(null);
    } catch (err) {
      setErrorAccion(err.response?.data?.mensaje || 'No se pudo eliminar la ciudad.');
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <section className={`${styles.page} ${styles.locationPage}`} aria-labelledby="ciudades-title">
      <SucursalesSubNav />

      <header className={styles.heading}>
        <div>
          <h1 id="ciudades-title">Ciudades</h1>
          <p>Mantén el catálogo geográfico utilizado por las sucursales.</p>
        </div>
      </header>

      <div className={styles.summary} aria-label="Resumen de ciudades">
        <div className={styles.stat}><strong>{ciudades.length}</strong><span>Ciudades registradas</span></div>
        <div className={styles.stat}><strong>{ciudadesFiltradas.length}</strong><span>Resultados visibles</span></div>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Buscar ciudades</span>
          <input
            type="search"
            name="q"
            autoComplete="off"
            value={busqueda}
            onChange={(event) => actualizarBusqueda(event.target.value)}
            placeholder="Buscar por nombre…"
          />
        </label>
        <button type="button" onClick={abrirModalCrear} className={`${styles.button} ${styles.primary}`}>
          <PlusCircle size={16} aria-hidden="true" /> Nueva ciudad
        </button>
      </div>

      <p className={styles.resultCount} aria-live="polite"><strong>{ciudadesFiltradas.length}</strong> de {ciudades.length} ciudades</p>
      <SucursalAlert mensaje={errorCiudades || errorAccion} />

      <section className={styles.tablePanel} aria-label="Ciudades registradas">
        <table className={styles.table} aria-busy={cargandoCiudades}>
          <thead><tr><th scope="col" style={{ width: '16%' }}>ID</th><th scope="col">Ciudad</th><th scope="col" style={{ width: '32%', textAlign: 'right' }}>Acciones</th></tr></thead>
          <tbody>
            {cargandoCiudades ? (
              <tr><td colSpan="3" className={styles.loading}>Cargando ciudades…</td></tr>
            ) : ciudadesFiltradas.length === 0 ? (
              <tr><td colSpan="3" className={styles.empty}><strong>No hay ciudades para mostrar.</strong><span>Prueba con otra búsqueda o registra una ciudad.</span></td></tr>
            ) : ciudadesFiltradas.map((ciudad) => (
              <tr key={ciudad.id_ciudad}>
                <td data-label="ID" className={`${styles.secondary} ${styles.mono}`}>{ciudad.id_ciudad}</td>
                <td data-label="Ciudad"><span className={styles.identity}>{ciudad.nombre_ciudad}</span></td>
                <td data-label="Acciones" className={styles.actionsCell}>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => abrirModalEditar(ciudad)} className={styles.button}><Pencil size={14} aria-hidden="true" /> Editar</button>
                    <button type="button" onClick={() => setCiudadAEliminar(ciudad)} disabled={eliminandoId === ciudad.id_ciudad} className={`${styles.button} ${styles.danger}`}><Trash2 size={14} aria-hidden="true" /> Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <CiudadFormModal
        isOpen={mostrarModal}
        modoEdicion={modoEdicion}
        formulario={formulario}
        guardando={guardando}
        errorFormulario={errorFormulario}
        onClose={cerrarModal}
        onSubmit={manejarGuardar}
        onChange={(event) => setFormulario({ ...formulario, [event.target.name]: event.target.value })}
      />

      <CiudadDeleteModal
        isOpen={Boolean(ciudadAEliminar)}
        ciudad={ciudadAEliminar}
        eliminando={Boolean(eliminandoId)}
        onClose={() => !eliminandoId && setCiudadAEliminar(null)}
        onConfirm={confirmarEliminar}
      />
    </section>
  );
}
