import { useToast } from '../../context/ToastContext.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProveedorActionBar from '../../components/inventario/proveedores/ProveedorActionBar.jsx';
import ProveedorTable from '../../components/inventario/proveedores/ProveedorTable.jsx';
import ProveedorFormModal from '../../components/inventario/proveedores/ProveedorFormModal.jsx';
import ProveedorContactosModal from '../../components/inventario/proveedores/ProveedorContactosModal.jsx';
import ProveedorDeleteModal from '../../components/inventario/proveedores/ProveedorDeleteModal.jsx';
import ProveedorEstadoModal from '../../components/inventario/proveedores/ProveedorEstadoModal.jsx';
import useProveedores from '../../hooks/useProveedores';
import usePaginacionURL, { leerPaginacionURL } from '../../hooks/usePaginacionURL';
import Paginacion from '../../components/ui/Paginacion.jsx';
import { ejecutarTransicionDeVista } from '../../utils/viewTransition';
import styles from '../../styles/ManagementUI.module.css';

const formularioInicial = { nombre: '' };

export default function Proveedores() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const busqueda = searchParams.get('q') || '';
  const estadoParam = searchParams.get('estado');
  const estadoSeleccionado = ['activo', 'inactivo'].includes(estadoParam) ? estadoParam : 'todos';
  const { pagina, limite } = leerPaginacionURL(searchParams);
  const activo = estadoSeleccionado === 'todos' ? undefined : estadoSeleccionado === 'activo';
  const { proveedores, paginacion, cargando, error, refrescar, crear, actualizar, cambiarEstado, eliminar } = useProveedores({ pagina, limite, busqueda, activo });
  const { actualizar: actualizarVista, crearDestino, onLimiteChange } = usePaginacionURL({ paginacion, cargando });
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioBase, setFormularioBase] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [proveedorContactos, setProveedorContactos] = useState(null);
  const [proveedorACambiarEstado, setProveedorACambiarEstado] = useState(null);
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);
  const hayCambios = formulario.nombre !== formularioBase.nombre;

  useEffect(() => {
    document.title = 'Proveedores · FarmaCom';
  }, []);

  const actualizarParametro = (nombre, valor, valorInicial = '') => {
    actualizarVista({ [nombre]: !valor || valor === valorInicial ? '' : valor }, true);
  };

  const actualizarEstado = (estado) => {
    ejecutarTransicionDeVista(() => actualizarParametro('estado', estado, 'todos'));
  };

  const proveedoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return proveedores.filter((proveedor) => {
      if (estadoSeleccionado === 'activo' && !proveedor.activo) return false;
      if (estadoSeleccionado === 'inactivo' && proveedor.activo) return false;
      return !termino || proveedor.nombre.toLocaleLowerCase('es').includes(termino);
    });
  }, [busqueda, estadoSeleccionado, proveedores]);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setIdEditando(null);
    setFormulario(formularioInicial);
    setFormularioBase(formularioInicial);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (proveedor) => {
    const valores = { nombre: proveedor.nombre };
    setModoEdicion(true);
    setIdEditando(proveedor.id_proveedor);
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
      toast.success('Proveedor guardado correctamente.');
      setMostrarModal(false);
      setFormulario(formularioInicial);
      setFormularioBase(formularioInicial);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo guardar el proveedor.');
    } finally {
      setGuardando(false);
    }
  };

  const solicitarCambiarEstado = (proveedor) => {
    setProveedorACambiarEstado(proveedor);
  };

  const confirmarCambiarEstado = async () => {
    if (!proveedorACambiarEstado) return;
    try {
      setProcesandoId(proveedorACambiarEstado.id_proveedor);
      await cambiarEstado(proveedorACambiarEstado.id_proveedor, !proveedorACambiarEstado.activo);
      toast.success('Estado actualizado correctamente.');
      setProveedorACambiarEstado(null);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo cambiar el estado.');
    } finally {
      setProcesandoId(null);
    }
  };

  const solicitarEliminar = (proveedor) => {
    setProveedorAEliminar(proveedor);
  };

  const confirmarEliminar = async () => {
    if (!proveedorAEliminar) return;
    try {
      setProcesandoId(proveedorAEliminar.id_proveedor);
      const resultado = await eliminar(proveedorAEliminar.id_proveedor);
      toast.success(resultado?.mensaje || 'Proveedor procesado correctamente.');
      setProveedorAEliminar(null);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo procesar el proveedor.');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section className={`${styles.page} ${styles.locationPage}`} aria-labelledby="proveedores-title">
      <header className={styles.heading}>
        <div>
          <h1 id="proveedores-title">Proveedores</h1>
          <p>Administra distribuidores, disponibilidad y datos de contacto.</p>
        </div>
      </header>

      <div className={styles.quickFilters} aria-label="Filtrar proveedores por estado">
        {[
          ['todos', 'Todos'],
          ['activo', 'Activos'],
          ['inactivo', 'Inactivos'],
        ].map(([valor, etiqueta]) => (
          <button key={valor} type="button" className={styles.quickFilter} aria-pressed={estadoSeleccionado === valor} onClick={() => actualizarEstado(valor)}>
            <span>{etiqueta}</span>
          </button>
        ))}
      </div>

      <ProveedorActionBar busqueda={busqueda} onBusquedaChange={(evento) => actualizarParametro('q', evento.target.value)} onCrear={abrirModalCrear} />
      <p className={styles.resultCount} aria-live="polite"><strong>{paginacion?.total ?? 0}</strong> proveedores encontrados</p>

      {error && proveedores.length > 0 && <p role="alert" className={styles.alert}>{error}</p>}

      <ProveedorTable cargando={cargando} error={error} proveedores={proveedoresFiltrados} hayFiltros={Boolean(busqueda.trim()) || estadoSeleccionado !== 'todos'} onRetry={refrescar} onEditar={abrirModalEditar} onCambiarEstado={solicitarCambiarEstado} onContactos={setProveedorContactos} onEliminar={solicitarEliminar} procesandoId={procesandoId} />

      {!error && <Paginacion paginacion={paginacion} crearDestino={crearDestino}
        onLimiteChange={onLimiteChange} cargando={cargando} sustantivo="proveedores" />}

      <ProveedorFormModal isOpen={mostrarModal} modoEdicion={modoEdicion} formulario={formulario} hayCambios={hayCambios} guardando={guardando} errorFormulario={errorFormulario} onClose={cerrarModal} onSubmit={manejarGuardar} onChange={manejarCambio} />
      <ProveedorContactosModal isOpen={Boolean(proveedorContactos)} proveedor={proveedorContactos} onClose={() => setProveedorContactos(null)} />
      <ProveedorEstadoModal isOpen={Boolean(proveedorACambiarEstado)} proveedor={proveedorACambiarEstado} procesando={Boolean(procesandoId)} error={null} onClose={() => { if (!procesandoId) setProveedorACambiarEstado(null); }} onConfirm={confirmarCambiarEstado} />
      <ProveedorDeleteModal isOpen={Boolean(proveedorAEliminar)} proveedor={proveedorAEliminar} eliminando={Boolean(procesandoId)} error={null} onClose={() => { if (!procesandoId) setProveedorAEliminar(null); }} onConfirm={confirmarEliminar} />
    </section>
  );
}
