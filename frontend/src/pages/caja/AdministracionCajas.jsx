import { useToast } from '../../context/ToastContext.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ui from '../../components/caja/CajaUI.module.css';
import useAvisoCambiosCaja, { confirmarDescartarCambiosCaja } from '../../hooks/useAvisoCambiosCaja';
import CajaFormModal from '../../components/caja/CajaFormModal';
import CajaSubNav from '../../components/caja/CajaSubNav';
import CajaTable from '../../components/caja/CajaTable';
import { useAuth } from '../../context/AuthContext';
import useAdministracionCajas from '../../hooks/useAdministracionCajas';
import useSucursales from '../../hooks/useSucursales';
import usePaginacionURL, { leerPaginacionURL } from '../../hooks/usePaginacionURL';
import Paginacion from '../../components/ui/Paginacion.jsx';

const formularioInicial = { id_sucursal: '', nombre: '' };

export default function AdministracionCajas() {
  const toast = useToast();
  const { usuario } = useAuth();
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales } = useSucursales();
  const [parametros] = useSearchParams();
  const busqueda = parametros.get('q') || '';
  const { pagina, limite } = leerPaginacionURL(parametros);
  const { cajas, paginacion, cargando, error, crear, actualizar, recargar } = useAdministracionCajas({ pagina, limite, busqueda });
  const { actualizar: actualizarVista, crearDestino, onLimiteChange } = usePaginacionURL({ paginacion, cargando });
  const [formulario, setFormulario] = useState(formularioInicial);
  const [cajaEditando, setCajaEditando] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const hayCambios = mostrarModal && (formulario.nombre !== (cajaEditando?.nombre || '') || formulario.id_sucursal !== String(cajaEditando?.id_sucursal || usuario?.id_sucursal || ''));
  useAvisoCambiosCaja(hayCambios);
  useEffect(() => { document.title = 'Administración de cajas · FarmaCom'; }, []);
  const cerrarModal = () => { if (!guardando && (!hayCambios || confirmarDescartarCambiosCaja())) setMostrarModal(false); };

  const cajasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return termino ? cajas.filter((caja) => [caja.nombre, caja.nombre_sucursal]
      .some((valor) => valor?.toLocaleLowerCase('es').includes(termino))) : cajas;
  }, [busqueda, cajas]);

  const abrirCreacion = () => {
    setCajaEditando(null);
    setFormulario({
      ...formularioInicial,
      id_sucursal: usuario?.id_sucursal ? String(usuario.id_sucursal) : '',
    });
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirEdicion = (caja) => {
    setCajaEditando(caja);
    setFormulario({ id_sucursal: String(caja.id_sucursal), nombre: caja.nombre });
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const manejarGuardar = async (evento) => {
    evento.preventDefault();
    const nombre = formulario.nombre.trim();
    if (!formulario.id_sucursal || !nombre) {
      setErrorFormulario('Completa todos los campos del formulario.');
      return;
    }

    try {
      setGuardando(true);
      setErrorFormulario(null);
      if (cajaEditando) await actualizar(cajaEditando.id_caja, { nombre });
      else await crear({ id_sucursal: Number(formulario.id_sucursal), nombre });
      setMostrarModal(false);
      toast.success(cajaEditando ? 'La caja se actualizó correctamente.' : 'La caja se creó correctamente.');
    } catch (errorSolicitud) {
      toast.error(errorSolicitud.message || 'No se pudo guardar la caja.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (caja) => {
    try {
      setCambiandoEstadoId(caja.id_caja);
      await actualizar(caja.id_caja, { activa: !caja.activa });
      toast.success(caja.activa ? 'La caja se desactivó correctamente.' : 'La caja se activó correctamente.');
    } catch (errorSolicitud) {
      toast.error(errorSolicitud.message || 'No se pudo cambiar el estado de la caja.');
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  return (
    <div className={ui.page}>
      <header className={ui.heading}>
        <div><h1>Administración de cajas</h1><p>Cajas y disponibilidad por sucursal.</p></div>
        <button type="button" onClick={abrirCreacion} className={`${ui.button} ${ui.primary}`}><Plus size={16} aria-hidden="true" />Nueva caja</button>
      </header>
      <CajaSubNav rol={usuario?.rol} />
      <div className={ui.toolbar}>
        <label className={ui.search}><Search size={16} aria-hidden="true" /><input type="search" name="buscar_caja" autoComplete="off" aria-label="Buscar cajas" placeholder="Buscar por caja o sucursal…" value={busqueda} onChange={(evento) => actualizarVista({q: evento.target.value}, true)} /></label>
        {!cargando && !error && <p className={ui.count} aria-live="polite">{paginacion?.total ?? 0} cajas encontradas</p>}
      </div>
      {(error || errorSucursales) && <div role="alert" className={`${ui.notice} ${ui.error}`}>{error || errorSucursales}{error && <button type="button" className={ui.button} onClick={recargar}>Reintentar</button>}</div>}
      {!error && <CajaTable cargando={cargando} cajas={cajasFiltradas} onEditar={abrirEdicion} onCambiarEstado={cambiarEstado} cambiandoEstadoId={cambiandoEstadoId} onLimpiar={busqueda ? () => actualizarVista({q: ''}, true) : undefined} />}
      {!error && <Paginacion paginacion={paginacion} crearDestino={crearDestino}
        onLimiteChange={onLimiteChange} cargando={cargando} sustantivo="cajas" />}
      <CajaFormModal abierta={mostrarModal} editando={Boolean(cajaEditando)} formulario={formulario} sucursales={sucursales} cargandoSucursales={cargandoSucursales} guardando={guardando} error={errorFormulario} onClose={cerrarModal} onChange={({ target: { name, value } }) => { setFormulario((actual) => ({ ...actual, [name]: value })); setErrorFormulario(null); }} onSubmit={manejarGuardar} />
    </div>
  );
}
