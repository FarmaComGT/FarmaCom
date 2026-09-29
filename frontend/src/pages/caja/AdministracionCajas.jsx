import React, { useMemo, useState } from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { motion } from 'motion/react';
import CajaFormModal from '../../components/caja/CajaFormModal';
import CajaSubNav from '../../components/caja/CajaSubNav';
import CajaTable from '../../components/caja/CajaTable';
import { useAuth } from '../../context/AuthContext';
import useAdministracionCajas from '../../hooks/useAdministracionCajas';
import useSucursales from '../../hooks/useSucursales';

const formularioInicial = { id_sucursal: '', nombre: '' };

export default function AdministracionCajas() {
  const { usuario } = useAuth();
  const { cajas, cargando, error, crear, actualizar } = useAdministracionCajas();
  const { sucursales, cargando: cargandoSucursales, error: errorSucursales } = useSucursales();
  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState(formularioInicial);
  const [cajaEditando, setCajaEditando] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const cajasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (!termino) return cajas;
    return cajas.filter((caja) => [caja.nombre, caja.nombre_sucursal]
      .some((valor) => valor?.toLocaleLowerCase('es').includes(termino)));
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
    } catch (errorSolicitud) {
      setErrorFormulario(errorSolicitud.message || 'No se pudo guardar la caja.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (caja) => {
    try {
      setCambiandoEstadoId(caja.id_caja);
      setErrorAccion(null);
      await actualizar(caja.id_caja, { activa: !caja.activa });
    } catch (errorSolicitud) {
      setErrorAccion(errorSolicitud.message || 'No se pudo cambiar el estado de la caja.');
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  return (
    <div className="space-y-8">
      <CajaSubNav rol={usuario?.rol} />

      <div>
        <h1 className="font-headline text-2xl font-extrabold text-primary">Administración de cajas</h1>
        <p className="mt-1 text-sm text-slate-500">Crea y administra las cajas disponibles en cada sucursal.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 rounded-2xl bg-surface-container-low p-4 md:flex-row">
        <div className="group relative w-full flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
          <input type="search" aria-label="Buscar cajas" placeholder="Buscar por caja o sucursal..." value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} className="w-full rounded-xl border-none bg-surface-container-lowest py-3 pl-12 pr-4 text-sm font-medium shadow-sm transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20" />
        </div>
        <button type="button" onClick={abrirCreacion} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-linear-to-br from-primary to-primary-container px-6 py-3 font-headline text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,81,71,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,81,71,0.3)] active:translate-y-0 md:w-auto">
          <PlusCircle className="h-4 w-4" /> Nueva caja
        </button>
      </motion.div>

      {(error || errorSucursales || errorAccion) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error || errorSucursales || errorAccion}
        </div>
      )}

      <CajaTable cargando={cargando} cajas={cajasFiltradas} onEditar={abrirEdicion} onCambiarEstado={cambiarEstado} cambiandoEstadoId={cambiandoEstadoId} />
      <CajaFormModal abierta={mostrarModal} editando={Boolean(cajaEditando)} formulario={formulario} sucursales={sucursales} cargandoSucursales={cargandoSucursales} guardando={guardando} error={errorFormulario} onClose={() => !guardando && setMostrarModal(false)} onChange={({ target: { name, value } }) => setFormulario((actual) => ({ ...actual, [name]: value }))} onSubmit={manejarGuardar} />
    </div>
  );
}
