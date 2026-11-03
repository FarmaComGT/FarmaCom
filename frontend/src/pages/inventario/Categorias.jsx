import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import InventarioSubNav from '../../components/inventario/InventarioSubNav.jsx';
import CategoriaActionBar from '../../components/inventario/categorias/CategoriaActionBar.jsx';
import CategoriaTable from '../../components/inventario/categorias/CategoriaTable.jsx';
import CategoriaFormModal from '../../components/inventario/categorias/CategoriaFormModal.jsx';
import CategoriaDeleteModal from '../../components/inventario/categorias/CategoriaDeleteModal.jsx';
import useCategorias from '../../hooks/useCategorias';
import styles from '../../styles/ManagementUI.module.css';

const formularioInicial = { nombre: '' };

export default function Categorias() {
  const { categorias, cargando, error, refrescar, crear, actualizar, eliminar } = useCategorias();
  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get('q') || '';
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioBase, setFormularioBase] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const hayCambios = formulario.nombre !== formularioBase.nombre;

  useEffect(() => {
    document.title = 'Categorías · FarmaCom';
  }, []);

  const actualizarBusqueda = (valor) => {
    setSearchParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (valor) siguientes.set('q', valor);
      else siguientes.delete('q');
      return siguientes;
    }, { replace: true });
  };

  const categoriasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (!termino) return categorias;
    return categorias.filter((categoria) => categoria.nombre.toLocaleLowerCase('es').includes(termino));
  }, [busqueda, categorias]);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setIdEditando(null);
    setFormulario(formularioInicial);
    setFormularioBase(formularioInicial);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (categoria) => {
    const valores = { nombre: categoria.nombre };
    setModoEdicion(true);
    setIdEditando(categoria.id_categoria);
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
      setErrorFormulario(err.response?.data?.mensaje || 'No se pudo guardar la categoría.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!categoriaAEliminar) return;
    try {
      setErrorAccion(null);
      setEliminandoId(categoriaAEliminar.id_categoria);
      await eliminar(categoriaAEliminar.id_categoria);
      setCategoriaAEliminar(null);
    } catch (err) {
      setErrorAccion(err.response?.data?.mensaje || 'No se pudo eliminar la categoría.');
    } finally {
      setEliminandoId(null);
    }
  };

  const solicitarEliminar = (categoria) => {
    setErrorAccion(null);
    setCategoriaAEliminar(categoria);
  };

  return (
    <section className={`${styles.page} ${styles.locationPage}`} aria-labelledby="categorias-title">
      <InventarioSubNav />
      <header className={styles.heading}>
        <div>
          <h1 id="categorias-title">Categorías</h1>
          <p>Organiza los productos en grupos fáciles de encontrar.</p>
        </div>
      </header>

      <CategoriaActionBar busqueda={busqueda} onBusquedaChange={(evento) => actualizarBusqueda(evento.target.value)} onCrear={abrirModalCrear} />

      <p className={styles.resultCount} aria-live="polite">
        <strong>{categoriasFiltradas.length}</strong> de {categorias.length} categorías
      </p>

      {errorAccion && !categoriaAEliminar && <p role="alert" className={styles.alert}>{errorAccion}</p>}
      {error && categorias.length > 0 && <p role="alert" className={styles.alert}>{error}</p>}

      <CategoriaTable
        cargando={cargando}
        error={error}
        categorias={categoriasFiltradas}
        hayBusqueda={Boolean(busqueda.trim())}
        onRetry={refrescar}
        onEditar={abrirModalEditar}
        onEliminar={solicitarEliminar}
        eliminandoId={eliminandoId}
      />

      <CategoriaFormModal
        isOpen={mostrarModal}
        modoEdicion={modoEdicion}
        formulario={formulario}
        hayCambios={hayCambios}
        guardando={guardando}
        errorFormulario={errorFormulario}
        onClose={cerrarModal}
        onSubmit={manejarGuardar}
        onChange={manejarCambio}
      />

      <CategoriaDeleteModal
        isOpen={Boolean(categoriaAEliminar)}
        categoria={categoriaAEliminar}
        eliminando={Boolean(eliminandoId)}
        error={errorAccion}
        onClose={() => { if (!eliminandoId) setCategoriaAEliminar(null); }}
        onConfirm={confirmarEliminar}
      />
    </section>
  );
}
