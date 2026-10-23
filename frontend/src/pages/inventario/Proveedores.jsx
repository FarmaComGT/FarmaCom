import React, { useMemo, useState } from 'react';
import InventarioSubNav from '../../components/inventario/InventarioSubNav.jsx';
import ProveedorActionBar from '../../components/inventario/proveedores/ProveedorActionBar.jsx';
import ProveedorTable from '../../components/inventario/proveedores/ProveedorTable.jsx';
import ProveedorFormModal from '../../components/inventario/proveedores/ProveedorFormModal.jsx';
import ProveedorContactosModal from '../../components/inventario/proveedores/ProveedorContactosModal.jsx';
import ProveedorDeleteModal from '../../components/inventario/proveedores/ProveedorDeleteModal.jsx';
import useProveedores from '../../hooks/useProveedores';

const formularioInicial = { nombre: '' };

export default function Proveedores() {
  const {
    proveedores,
    cargando,
    error,
    crear,
    actualizar,
    cambiarEstado,
    eliminar,
  } = useProveedores();

  const [busqueda, setBusqueda] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [proveedorContactos, setProveedorContactos] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [mensajeAccion, setMensajeAccion] = useState(null);
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);

  const proveedoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return proveedores;
    return proveedores.filter((p) => p.nombre.toLowerCase().includes(termino));
  }, [busqueda, proveedores]);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setIdEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (proveedor) => {
    setModoEdicion(true);
    setIdEditando(proveedor.id_proveedor);
    setFormulario({ nombre: proveedor.nombre });
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    setErrorFormulario(null);
    const nombre = formulario.nombre.trim();
    if (!nombre) { setErrorFormulario('El nombre es requerido.'); return; }
    try {
      setGuardando(true);
      if (modoEdicion && idEditando) {
        await actualizar(idEditando, { nombre });
      } else {
        await crear({ nombre });
      }
      setMostrarModal(false);
      setFormulario(formularioInicial);
    } catch (err) {
      setErrorFormulario(err.response?.data?.mensaje || 'No se pudo guardar el proveedor.');
    } finally {
      setGuardando(false);
    }
  };

  const manejarCambiarEstado = async (proveedor) => {
    try {
      setErrorAccion(null);
      setMensajeAccion(null);
      setProcesandoId(proveedor.id_proveedor);
      await cambiarEstado(proveedor.id_proveedor, !proveedor.activo);
    } catch (err) {
      setErrorAccion(err.response?.data?.mensaje || 'No se pudo cambiar el estado.');
    } finally {
      setProcesandoId(null);
    }
  };

  const confirmarEliminar = async () => {
    if (!proveedorAEliminar) return;
    try {
      setErrorAccion(null);
      setMensajeAccion(null);
      setProcesandoId(proveedorAEliminar.id_proveedor);
      const resultado = await eliminar(proveedorAEliminar.id_proveedor);
      setMensajeAccion(resultado?.mensaje || 'Proveedor procesado correctamente.');
      setProveedorAEliminar(null);
    } catch (err) {
      setErrorAccion(err.response?.data?.mensaje || 'No se pudo procesar el proveedor.');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <InventarioSubNav />

      <ProveedorActionBar
        busqueda={busqueda}
        onBusquedaChange={(e) => setBusqueda(e.target.value)}
        onCrear={abrirModalCrear}
      />

      {(error || errorAccion) && (
        <div className="bg-error-container/40 border border-error/20 rounded-xl px-4 py-3 text-sm text-on-error-container font-medium">
          {error || errorAccion}
        </div>
      )}

      {mensajeAccion && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {mensajeAccion}
        </div>
      )}

      <ProveedorTable
        cargando={cargando}
        proveedores={proveedoresFiltrados}
        onEditar={abrirModalEditar}
        onCambiarEstado={manejarCambiarEstado}
        onContactos={setProveedorContactos}
        onEliminar={setProveedorAEliminar}
        procesandoId={procesandoId}
      />

      <ProveedorFormModal
        isOpen={mostrarModal}
        modoEdicion={modoEdicion}
        formulario={formulario}
        guardando={guardando}
        errorFormulario={errorFormulario}
        onClose={cerrarModal}
        onSubmit={manejarGuardar}
        onChange={manejarCambio}
      />

      <ProveedorContactosModal
        isOpen={Boolean(proveedorContactos)}
        proveedor={proveedorContactos}
        onClose={() => setProveedorContactos(null)}
      />

      <ProveedorDeleteModal
        isOpen={Boolean(proveedorAEliminar)}
        proveedor={proveedorAEliminar}
        eliminando={procesandoId === proveedorAEliminar?.id_proveedor}
        onClose={() => { if (!procesandoId) setProveedorAEliminar(null); }}
        onConfirm={confirmarEliminar}
      />
    </div>
  );
}
