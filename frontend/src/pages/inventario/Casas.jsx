import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import InventarioSubNav from '../../components/inventario/InventarioSubNav.jsx';
import CasaActionBar from '../../components/inventario/casas/CasaActionBar.jsx';
import CasaTable from '../../components/inventario/casas/CasaTable.jsx';
import CasaFormModal from '../../components/inventario/casas/CasaFormModal.jsx';
import CasaDeleteModal from '../../components/inventario/casas/CasaDeleteModal.jsx';
import CasaEstadoModal from '../../components/inventario/casas/CasaEstadoModal.jsx';
import CasaContactosModal from '../../components/inventario/casas/CasaContactosModal.jsx';
import useCasas from '../../hooks/useCasas';
import { ejecutarTransicionDeVista } from '../../utils/viewTransition';
import styles from '../../styles/ManagementUI.module.css';

const formularioInicial = { nombre: '' };

export default function Casas() {
  const { casas, cargando, error, refrescar, crear, actualizar, cambiarEstado, eliminar } = useCasas();
  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get('q') || '';
  const estadoParam = searchParams.get('estado');
  const estadoSeleccionado = ['activa', 'inactiva'].includes(estadoParam) ? estadoParam : 'todas';
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioBase, setFormularioBase] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [casaAEliminar, setCasaAEliminar] = useState(null);
  const [casaACambiarEstado, setCasaACambiarEstado] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [mensajeAccion, setMensajeAccion] = useState(null);
  const [casaContactos, setCasaContactos] = useState(null);
  const hayCambios = formulario.nombre !== formularioBase.nombre;

  useEffect(() => {
    document.title = 'Casas farmacéuticas · FarmaCom';
  }, []);

  const actualizarParametro = (nombre, valor, valorInicial = '') => {
    setSearchParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (!valor || valor === valorInicial) siguientes.delete(nombre);
      else siguientes.set(nombre, valor);
      return siguientes;
    }, { replace: true });
  };

  const actualizarEstado = (estado) => {
    ejecutarTransicionDeVista(() => actualizarParametro('estado', estado, 'todas'));
  };

  const casasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return casas.filter((casa) => {
      if (estadoSeleccionado === 'activa' && !casa.activo) return false;
      if (estadoSeleccionado === 'inactiva' && casa.activo) return false;
      return !termino || casa.nombre.toLocaleLowerCase('es').includes(termino);
    });
  }, [busqueda, casas, estadoSeleccionado]);
  const totalActivas = useMemo(() => casas.filter((casa) => casa.activo).length, [casas]);
  const totalInactivas = casas.length - totalActivas;

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setIdEditando(null);
    setFormulario(formularioInicial);
    setFormularioBase(formularioInicial);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (casa) => {
    const valores = { nombre: casa.nombre };
    setModoEdicion(true);
    setIdEditando(casa.id_casa);
    setFormulario(valores);
    setFormularioBase(valores);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (!guardando) setMostrarModal(false);
  };

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
    if (errorFormulario) setErrorFormulario(null);
  };

  const manejarGuardar = async (evento) => {
    evento.preventDefault();
    setErrorFormulario(null);
    const nombre = formulario.nombre.trim();
    if (!nombre) {
      setErrorFormulario('El nombre es requerido.');
      return;
    }
    try {
      setGuardando(true);
      if (modoEdicion && idEditando) await actualizar(idEditando, { nombre });
      else await crear({ nombre });
      setMostrarModal(false);
      setFormulario(formularioInicial);
      setFormularioBase(formularioInicial);
    } catch (err) {
      setErrorFormulario(err.response?.data?.mensaje || 'No se pudo guardar la casa farmacéutica.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarCambiarEstado = async () => {
    if (!casaACambiarEstado) return;
    try {
      setErrorAccion(null);
      setMensajeAccion(null);
      setProcesandoId(casaACambiarEstado.id_casa);
      await cambiarEstado(casaACambiarEstado.id_casa, !casaACambiarEstado.activo);
      setCasaACambiarEstado(null);
    } catch (err) {
      setErrorAccion(err.response?.data?.mensaje || 'No se pudo cambiar el estado.');
    } finally {
      setProcesandoId(null);
    }
  };

  const solicitarCambiarEstado = (casa) => {
    setErrorAccion(null);
    setMensajeAccion(null);
    setCasaACambiarEstado(casa);
  };

  const confirmarEliminar = async () => {
    if (!casaAEliminar) return;
    try {
      setErrorAccion(null);
      setMensajeAccion(null);
      setProcesandoId(casaAEliminar.id_casa);
      const resultado = await eliminar(casaAEliminar.id_casa);
      setMensajeAccion(resultado?.mensaje || 'Casa farmacéutica procesada correctamente.');
      setCasaAEliminar(null);
    } catch (err) {
      setErrorAccion(err.response?.data?.mensaje || 'No se pudo eliminar la casa farmacéutica.');
    } finally {
      setProcesandoId(null);
    }
  };

  const solicitarEliminar = (casa) => {
    setErrorAccion(null);
    setMensajeAccion(null);
    setCasaAEliminar(casa);
  };

  return (
    <section className={`${styles.page} ${styles.locationPage}`} aria-labelledby="casas-title">
      <InventarioSubNav />
      <header className={styles.heading}>
        <div>
          <h1 id="casas-title">Casas farmacéuticas</h1>
          <p>Administra fabricantes, disponibilidad y datos de contacto.</p>
        </div>
      </header>

      <div className={styles.quickFilters} aria-label="Filtrar casas por estado">
        {[
          ['todas', 'Todas', casas.length],
          ['activa', 'Activas', totalActivas],
          ['inactiva', 'Inactivas', totalInactivas],
        ].map(([valor, etiqueta, total]) => (
          <button key={valor} type="button" className={styles.quickFilter} aria-pressed={estadoSeleccionado === valor} onClick={() => actualizarEstado(valor)}>
            <strong>{total}</strong><span>{etiqueta}</span>
          </button>
        ))}
      </div>

      <CasaActionBar busqueda={busqueda} onBusquedaChange={(evento) => actualizarParametro('q', evento.target.value)} onCrear={abrirModalCrear} />
      <p className={styles.resultCount} aria-live="polite"><strong>{casasFiltradas.length}</strong> de {casas.length} casas farmacéuticas</p>

      {errorAccion && !casaACambiarEstado && !casaAEliminar && <p role="alert" className={styles.alert}>{errorAccion}</p>}
      {error && casas.length > 0 && <p role="alert" className={styles.alert}>{error}</p>}
      {mensajeAccion && <p role="status" className={styles.statusMessage}>{mensajeAccion}</p>}

      <CasaTable
        cargando={cargando}
        error={error}
        casas={casasFiltradas}
        hayFiltros={Boolean(busqueda.trim()) || estadoSeleccionado !== 'todas'}
        onRetry={refrescar}
        onEditar={abrirModalEditar}
        onCambiarEstado={solicitarCambiarEstado}
        onContactos={setCasaContactos}
        onEliminar={solicitarEliminar}
        procesandoId={procesandoId}
      />

      <CasaContactosModal isOpen={Boolean(casaContactos)} casa={casaContactos} onClose={() => setCasaContactos(null)} />
      <CasaFormModal isOpen={mostrarModal} modoEdicion={modoEdicion} formulario={formulario} hayCambios={hayCambios} guardando={guardando} errorFormulario={errorFormulario} onClose={cerrarModal} onSubmit={manejarGuardar} onChange={manejarCambio} />
      <CasaEstadoModal isOpen={Boolean(casaACambiarEstado)} casa={casaACambiarEstado} procesando={Boolean(procesandoId)} error={errorAccion} onClose={() => { if (!procesandoId) setCasaACambiarEstado(null); }} onConfirm={confirmarCambiarEstado} />
      <CasaDeleteModal isOpen={Boolean(casaAEliminar)} casa={casaAEliminar} eliminando={Boolean(procesandoId)} error={errorAccion} onClose={() => { if (!procesandoId) setCasaAEliminar(null); }} onConfirm={confirmarEliminar} />
    </section>
  );
}
