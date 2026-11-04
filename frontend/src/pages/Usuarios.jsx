import { useToast } from '../context/ToastContext.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import UsuarioTable from '../components/usuarios/UsuarioTable.jsx';
import UsuarioFormModal from '../components/usuarios/UsuarioFormModal.jsx';
import UsuarioEstadoModal from '../components/usuarios/UsuarioEstadoModal.jsx';
import UsuarioStatsGrid from '../components/usuarios/UsuarioStatsGrid.jsx';
import UsuarioActionBar from '../components/usuarios/UsuarioActionBar.jsx';
import UsuarioAlert from '../components/usuarios/UsuarioAlert.jsx';
import useUsuarios from '../hooks/useUsuarios';
import useSucursales from '../hooks/useSucursales';
import useLaboratorios from '../hooks/useLaboratorios';
import { ejecutarTransicionDeVista } from '../utils/viewTransition';
import styles from '../styles/ManagementUI.module.css';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = [
  { value: 'dueno', label: 'Dueño' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'dependiente', label: 'Dependiente' },
  { value: 'laboratorista', label: 'Laboratorista' },
];

const estadoInicialFormulario = {
  nombre_usuario: '',
  correo_usuario: '',
  contrasena: '',
  rol: '',
  id_sucursal: '',
  id_laboratorio: '',
};

export default function Usuarios() {
  const toast = useToast();
  const { usuario: usuarioSesion } = useAuth();
  const { usuarios, cargando, error, crear, actualizar, cambiarEstado } = useUsuarios();
  const { sucursales, cargando: cargandoSucursales } = useSucursales();
  const { laboratorios, cargando: cargandoLaboratorios } = useLaboratorios();

  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get('q') || '';
  const estadoParam = searchParams.get('estado');
  const estadoSeleccionado = ['activo', 'inactivo'].includes(estadoParam)
    ? estadoParam
    : 'todos';
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [formulario, setFormulario] = useState(estadoInicialFormulario);

  const [usuarioACambiarEstado, setUsuarioACambiarEstado] = useState(null);
  const esDueno = usuarioSesion?.rol === 'dueno';
  const puedeEditar = (objetivo) => esDueno || (
    usuarioSesion?.rol === 'administrador'
    && Number(objetivo.id_sucursal) === Number(usuarioSesion.id_sucursal)
    && objetivo.rol !== 'dueno'
    && (objetivo.rol !== 'administrador' || objetivo.id_usuario === usuarioSesion.id_usuario)
  );
  const sucursalesPermitidas = esDueno
    ? sucursales
    : sucursales.filter((sucursal) => Number(sucursal.id_sucursal) === Number(usuarioSesion?.id_sucursal));
  const editandoCuentaPropia = Number(idEditando) === Number(usuarioSesion?.id_usuario);
  const rolesPermitidos = esDueno
    ? ROLES
    : ROLES.filter(({ value }) => (
      editandoCuentaPropia ? value === 'administrador' : ['dependiente', 'laboratorista'].includes(value)
    ));

  useEffect(() => {
    document.title = 'Usuarios · FarmaCom';
  }, []);

  const actualizarBusqueda = (valor) => {
    setSearchParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      if (valor) siguientes.set('q', valor);
      else siguientes.delete('q');
      return siguientes;
    }, { replace: true });
  };

  const actualizarEstado = (estado) => {
    ejecutarTransicionDeVista(() => {
      setSearchParams((actuales) => {
        const siguientes = new URLSearchParams(actuales);
        if (estado === 'todos') siguientes.delete('estado');
        else siguientes.set('estado', estado);
        return siguientes;
      }, { replace: true });
    });
  };

  const mapaSucursales = useMemo(() => {
    return sucursales.reduce((acc, s) => {
      acc[s.id_sucursal] = s.nombre_sucursal;
      return acc;
    }, {});
  }, [sucursales]);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (estadoSeleccionado !== 'todos' && u.estado_usuario !== estadoSeleccionado) {
        return false;
      }
      if (!termino) return true;
      const nombre = u.nombre_usuario?.toLowerCase() || '';
      const correo = u.correo_usuario?.toLowerCase() || '';
      return nombre.includes(termino) || correo.includes(termino);
    });
  }, [busqueda, estadoSeleccionado, usuarios]);

  const totalActivos = useMemo(
    () => usuarios.filter((u) => u.estado_usuario === 'activo').length,
    [usuarios],
  );

  const totalInactivos = useMemo(
    () => usuarios.filter((u) => u.estado_usuario === 'inactivo').length,
    [usuarios],
  );

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setIdEditando(null);
    setFormulario(estadoInicialFormulario);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (usuario) => {
    setModoEdicion(true);
    setIdEditando(usuario.id_usuario);
    setFormulario({
      nombre_usuario: usuario.nombre_usuario || '',
      correo_usuario: usuario.correo_usuario || '',
      contrasena: '',
      rol: usuario.rol || '',
      id_sucursal: String(usuario.id_sucursal || ''),
      id_laboratorio: String(usuario.id_laboratorio || ''),
    });
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
  };

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setFormulario((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'rol' && value !== 'laboratorista' ? { id_laboratorio: '' } : {}),
    }));
  };

  const manejarGuardar = async (evento) => {
    evento.preventDefault();
    setErrorFormulario(null);

    const nombre = formulario.nombre_usuario.trim();
    const correo = formulario.correo_usuario.trim();
    const rol = formulario.rol;
    const idSucursal = Number(formulario.id_sucursal);
    const idLaboratorio = Number(formulario.id_laboratorio);

    if (!nombre || !correo || !rol || !idSucursal) {
      setErrorFormulario('Completa todos los campos del formulario.');
      return;
    }

    if (rol === 'laboratorista' && !idLaboratorio) {
      setErrorFormulario('Selecciona el laboratorio asignado al laboratorista.');
      return;
    }

    if (nombre.length > 100) {
      setErrorFormulario('El nombre no puede superar los 100 caracteres.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      setErrorFormulario('El correo electrónico no tiene un formato válido.');
      return;
    }

    if (!modoEdicion && formulario.contrasena.trim().length < 6) {
      setErrorFormulario('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setGuardando(true);
      if (modoEdicion && idEditando) {
        await actualizar(idEditando, {
          nombre_usuario: nombre,
          correo_usuario: correo,
          rol,
          id_sucursal: idSucursal,
          id_laboratorio: rol === 'laboratorista' ? idLaboratorio : null,
        });
      } else {
        await crear({
          nombre_usuario: nombre,
          correo_usuario: correo,
          contrasena: formulario.contrasena.trim(),
          rol,
          id_sucursal: idSucursal,
          id_laboratorio: rol === 'laboratorista' ? idLaboratorio : null,
        });
      }
      toast.success('Usuario guardado correctamente.');
      setMostrarModal(false);
      setFormulario(estadoInicialFormulario);
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el usuario.');
    } finally {
      setGuardando(false);
    }
  };

  const solicitarCambioEstado = (usuario) => {
    setUsuarioACambiarEstado(usuario);
  };

  const cerrarModalEstado = () => {
    if (cambiandoEstadoId) return;
    setUsuarioACambiarEstado(null);
  };

  const confirmarCambioEstado = async () => {
    // FIX: variable corregida (antes era usuarioAambiarEstado con doble 'a')
    if (!usuarioACambiarEstado) return;

    const esActivo = usuarioACambiarEstado.estado_usuario === 'activo';
    const nuevoEstado = esActivo ? 'inactivo' : 'activo';

    try {

      setCambiandoEstadoId(usuarioACambiarEstado.id_usuario);
      await cambiarEstado(usuarioACambiarEstado.id_usuario, nuevoEstado);
      toast.success('Estado del usuario actualizado correctamente.');
      setUsuarioACambiarEstado(null);
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado del usuario.');
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  return (
    <section className={`${styles.page} ${styles.locationPage}`} aria-labelledby="usuarios-title">
      <header className={styles.heading}>
        <div>
          <h1 id="usuarios-title">Usuarios</h1>
          <p>Administra accesos, roles y asignaciones del equipo.</p>
        </div>
      </header>

      <UsuarioStatsGrid
        totalUsuarios={usuarios.length}
        totalActivos={totalActivos}
        totalInactivos={totalInactivos}
        estadoSeleccionado={estadoSeleccionado}
        onSeleccionarEstado={actualizarEstado}
      />

      <UsuarioActionBar
        busqueda={busqueda}
        onBusquedaChange={(evento) => actualizarBusqueda(evento.target.value)}
        onCrear={esDueno ? abrirModalCrear : undefined}
      />

      <p className={styles.resultCount} aria-live="polite">
        <strong>{usuariosFiltrados.length}</strong> de {usuarios.length} usuarios
      </p>

      <UsuarioAlert mensaje={error} />

      <UsuarioTable
        cargando={cargando}
        usuarios={usuariosFiltrados}
        mapaSucursales={mapaSucursales}
        onEditar={abrirModalEditar}
        onCambiarEstado={solicitarCambioEstado}
        cambiandoEstadoId={cambiandoEstadoId}
        puedeEditar={puedeEditar}
        puedeCambiarEstado={esDueno}
      />

      <UsuarioFormModal
        isOpen={mostrarModal}
        modoEdicion={modoEdicion}
        formulario={formulario}
        sucursales={sucursalesPermitidas}
        cargandoSucursales={cargandoSucursales}
        laboratorios={laboratorios}
        cargandoLaboratorios={cargandoLaboratorios}
        guardando={guardando}
        errorFormulario={errorFormulario}
        onClose={cerrarModal}
        onSubmit={manejarGuardar}
        onChange={manejarCambio}
        rolesPermitidos={rolesPermitidos}
      />

      <UsuarioEstadoModal
        isOpen={Boolean(usuarioACambiarEstado)}
        usuario={usuarioACambiarEstado}
        cambiando={Boolean(cambiandoEstadoId)}
        onClose={cerrarModalEstado}
        onConfirm={confirmarCambioEstado}
      />
    </section>
  );
}
