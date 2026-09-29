import React, { useMemo, useState } from 'react';
import UsuarioTable from '../components/usuarios/UsuarioTable.jsx';
import UsuarioFormModal from '../components/usuarios/UsuarioFormModal.jsx';
import UsuarioEstadoModal from '../components/usuarios/UsuarioEstadoModal.jsx';
import UsuarioStatsGrid from '../components/usuarios/UsuarioStatsGrid.jsx';
import UsuarioActionBar from '../components/usuarios/UsuarioActionBar.jsx';
import UsuarioAlert from '../components/usuarios/UsuarioAlert.jsx';
import useUsuarios from '../hooks/useUsuarios';
import useSucursales from '../hooks/useSucursales';
import useLaboratorios from '../hooks/useLaboratorios';

const estadoInicialFormulario = {
  nombre_usuario: '',
  correo_usuario: '',
  contrasena: '',
  rol: '',
  id_sucursal: '',
  id_laboratorio: '',
};

export default function Usuarios() {
  const { usuarios, cargando, error, crear, actualizar, cambiarEstado } = useUsuarios();
  const { sucursales, cargando: cargandoSucursales } = useSucursales();
  const { laboratorios, cargando: cargandoLaboratorios } = useLaboratorios();

  const [busqueda, setBusqueda] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [formulario, setFormulario] = useState(estadoInicialFormulario);

  const [usuarioACambiarEstado, setUsuarioACambiarEstado] = useState(null);

  const mapaSucursales = useMemo(() => {
    return sucursales.reduce((acc, s) => {
      acc[s.id_sucursal] = s.nombre_sucursal;
      return acc;
    }, {});
  }, [sucursales]);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return usuarios;
    return usuarios.filter((u) => {
      const nombre = u.nombre_usuario?.toLowerCase() || '';
      const correo = u.correo_usuario?.toLowerCase() || '';
      return nombre.includes(termino) || correo.includes(termino);
    });
  }, [busqueda, usuarios]);

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
      setMostrarModal(false);
      setFormulario(estadoInicialFormulario);
    } catch (err) {
      setErrorFormulario(err.message || 'No se pudo guardar el usuario.');
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
      setErrorAccion(null);
      setCambiandoEstadoId(usuarioACambiarEstado.id_usuario);
      await cambiarEstado(usuarioACambiarEstado.id_usuario, nuevoEstado);
      setUsuarioACambiarEstado(null);
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo cambiar el estado del usuario.');
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  return (
    <div className="space-y-8">
      <UsuarioStatsGrid
        totalUsuarios={usuarios.length}
        totalActivos={totalActivos}
        totalInactivos={totalInactivos}
      />

      <UsuarioActionBar
        busqueda={busqueda}
        onBusquedaChange={(evento) => setBusqueda(evento.target.value)}
        onCrear={abrirModalCrear}
      />

      <UsuarioAlert mensaje={error} />
      <UsuarioAlert mensaje={errorAccion} />

      <UsuarioTable
        cargando={cargando}
        usuarios={usuariosFiltrados}
        mapaSucursales={mapaSucursales}
        onEditar={abrirModalEditar}
        onCambiarEstado={solicitarCambioEstado}
        cambiandoEstadoId={cambiandoEstadoId}
      />

      <UsuarioFormModal
        isOpen={mostrarModal}
        modoEdicion={modoEdicion}
        formulario={formulario}
        sucursales={sucursales}
        cargandoSucursales={cargandoSucursales}
        laboratorios={laboratorios}
        cargandoLaboratorios={cargandoLaboratorios}
        guardando={guardando}
        errorFormulario={errorFormulario}
        onClose={cerrarModal}
        onSubmit={manejarGuardar}
        onChange={manejarCambio}
      />

      <UsuarioEstadoModal
        isOpen={Boolean(usuarioACambiarEstado)}
        usuario={usuarioACambiarEstado}
        cambiando={Boolean(cambiandoEstadoId)}
        onClose={cerrarModalEstado}
        onConfirm={confirmarCambioEstado}
      />
    </div>
  );
}
