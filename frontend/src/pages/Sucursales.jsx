import { useToast } from '../context/ToastContext.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SucursalActionBar from '../components/sucursales/SucursalActionBar.jsx';
import SucursalAlert from '../components/sucursales/SucursalAlert.jsx';
import SucursalDeleteModal from '../components/sucursales/SucursalDeleteModal.jsx';
import ContactosSucursalModal from '../components/sucursales/ContactosSucursalModal.jsx';
import SucursalFormModal from '../components/sucursales/SucursalFormModal.jsx';
import SucursalStatsBanner from '../components/sucursales/SucursalStatsBanner.jsx';
import SucursalesSubNav from '../components/sucursales/SucursalesSubNav.jsx';
import SucursalTable from '../components/sucursales/SucursalTable.jsx';
import useCiudades from '../hooks/useCiudades';
import useSucursales from '../hooks/useSucursales';
import styles from '../styles/ManagementUI.module.css';

const estadoInicialFormulario = {
  nombre_sucursal: '',
  direccion: '',
  id_ciudad: '',
};

export default function Sucursales() {
  const toast = useToast();
  const { sucursales, cargando, error, crear, actualizar, eliminar } = useSucursales();
  const { ciudades, cargandoCiudades, errorCiudades } = useCiudades();

  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get('q') || '';
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [formulario, setFormulario] = useState(estadoInicialFormulario);
  const [sucursalAEliminar, setSucursalAEliminar] = useState(null);
  const [sucursalContactos, setSucursalContactos] = useState(null);

  useEffect(() => {
    document.title = 'Sucursales · FarmaCom';
  }, []);

  const actualizarBusqueda = (valor) => {
    setSearchParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (valor) siguientes.set('q', valor);
      else siguientes.delete('q');
      return siguientes;
    }, { replace: true });
  };

  const mapaCiudades = useMemo(() => {
    return ciudades.reduce((acc, ciudad) => {
      acc[ciudad.id_ciudad] = ciudad.nombre_ciudad;
      return acc;
    }, {});
  }, [ciudades]);

  const sucursalesFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) {
      return sucursales;
    }

    return sucursales.filter((sucursal) => {
      const nombre = sucursal.nombre_sucursal?.toLowerCase() || '';
      const direccion = sucursal.direccion?.toLowerCase() || '';
      const ciudad = mapaCiudades[sucursal.id_ciudad]?.toLowerCase() || '';
      return nombre.includes(termino) || direccion.includes(termino) || ciudad.includes(termino);
    });
  }, [busqueda, mapaCiudades, sucursales]);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setIdEditando(null);
    setFormulario(estadoInicialFormulario);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (sucursal) => {
    setModoEdicion(true);
    setIdEditando(sucursal.id_sucursal);
    setFormulario({
      nombre_sucursal: sucursal.nombre_sucursal || '',
      direccion: sucursal.direccion || '',
      id_ciudad: String(sucursal.id_ciudad || ''),
    });
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setMostrarModal(false);
  };

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const manejarGuardar = async (evento) => {
    evento.preventDefault();
    setErrorFormulario(null);

    const nombre = formulario.nombre_sucursal.trim();
    const direccion = formulario.direccion.trim();
    const idCiudad = Number(formulario.id_ciudad);

    if (!nombre || !direccion || !idCiudad) {
      setErrorFormulario('Completa todos los campos del formulario.');
      return;
    }

    if (nombre.length > 100) {
      setErrorFormulario('El nombre de la sucursal no puede superar los 100 caracteres.');
      return;
    }

    if (direccion.length > 255) {
      setErrorFormulario('La direcci\u00f3n no puede superar los 255 caracteres.');
      return;
    }

    const payload = {
      nombre_sucursal: nombre,
      direccion,
      id_ciudad: idCiudad,
    };

    try {
      setGuardando(true);

      if (modoEdicion && idEditando) {
        await actualizar(idEditando, payload);
      } else {
        await crear(payload);
      }

      toast.success('Sucursal guardada correctamente.');
      setMostrarModal(false);
      setFormulario(estadoInicialFormulario);
    } catch (err) {
      const mensaje = err.message || 'No se pudo guardar la sucursal.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const solicitarEliminar = (sucursal) => {
    setSucursalAEliminar(sucursal);
  };

  const cerrarModalEliminar = () => {
    if (eliminandoId) {
      return;
    }

    setSucursalAEliminar(null);
  };

  const confirmarEliminar = async () => {
    if (!sucursalAEliminar) {
      return;
    }

    try {

      setEliminandoId(sucursalAEliminar.id_sucursal);
      await eliminar(sucursalAEliminar.id_sucursal);
      toast.success('Sucursal eliminada correctamente.');
      setSucursalAEliminar(null);
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la sucursal.');
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <section className={`${styles.page} ${styles.locationPage}`} aria-labelledby="sucursales-title">
      <SucursalesSubNav />

      <header className={styles.heading}>
        <div>
          <h1 id="sucursales-title">Sucursales</h1>
          <p>Gestiona ubicaciones, direcciones y datos de contacto.</p>
        </div>
      </header>

      <SucursalStatsBanner
        totalFiltradas={sucursalesFiltradas.length}
        totalSucursales={sucursales.length}
      />

      <SucursalActionBar
        busqueda={busqueda}
        onBusquedaChange={(evento) => actualizarBusqueda(evento.target.value)}
        onCrear={abrirModalCrear}
      />

      <p className={styles.resultCount} aria-live="polite">
        <strong>{sucursalesFiltradas.length}</strong> de {sucursales.length} sucursales
      </p>

      <SucursalAlert mensaje={error || errorCiudades} />

      <SucursalTable
        cargando={cargando}
        sucursales={sucursalesFiltradas}
        mapaCiudades={mapaCiudades}
        onEditar={abrirModalEditar}
        onEliminar={solicitarEliminar}
        onContactos={setSucursalContactos}
        eliminandoId={eliminandoId}
      />

      <SucursalFormModal
        isOpen={mostrarModal}
        modoEdicion={modoEdicion}
        formulario={formulario}
        ciudades={ciudades}
        cargandoCiudades={cargandoCiudades}
        guardando={guardando}
        errorFormulario={errorFormulario}
        onClose={cerrarModal}
        onSubmit={manejarGuardar}
        onChange={manejarCambio}
      />

      <ContactosSucursalModal
        isOpen={Boolean(sucursalContactos)}
        sucursal={sucursalContactos}
        onClose={() => setSucursalContactos(null)}
      />

      <SucursalDeleteModal
        isOpen={Boolean(sucursalAEliminar)}
        sucursal={sucursalAEliminar}
        eliminando={Boolean(eliminandoId)}
        onClose={cerrarModalEliminar}
        onConfirm={confirmarEliminar}
      />
    </section>
  );
}
