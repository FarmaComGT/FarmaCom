import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLaboratorios from '../../hooks/useLaboratorios';
import usePacientes from '../../hooks/usePacientes';
import useAlmacenamientoLocal from '../../hooks/useAlmacenamientoLocal';
import PacienteActionBar from '../../components/laboratorio/pacientes/PacienteActionBar.jsx';
import PacienteStatsGrid from '../../components/laboratorio/pacientes/PacienteStatsGrid.jsx';
import PacienteAlert from '../../components/laboratorio/pacientes/PacienteAlert.jsx';
import PacienteTable from '../../components/laboratorio/pacientes/PacienteTable.jsx';
import PacienteFormModal from '../../components/laboratorio/pacientes/PacienteFormModal.jsx';
import PacienteAnularModal from '../../components/laboratorio/pacientes/PacienteAnularModal.jsx';
import PacienteEliminarModal from '../../components/laboratorio/pacientes/PacienteEliminarModal.jsx';
import ConfiguracionAlmacenamientoModal from '../../components/laboratorio/ConfiguracionAlmacenamientoModal.jsx';
import { ejecutarTransicionDeVista } from '../../utils/viewTransition';
import management from '../../styles/ManagementUI.module.css';
import laboratory from '../../styles/LaboratoryUI.module.css';

export default function Pacientes() {
  const { usuario } = useAuth();
  const esLaboratorista = usuario?.rol === 'laboratorista';
  const { laboratorios } = useLaboratorios({ omitir: esLaboratorista });

  const [idLaboratorioSeleccionado, setIdLaboratorioSeleccionado] = useState(null);

  useEffect(() => {
    if (esLaboratorista) {
      setIdLaboratorioSeleccionado(usuario?.id_laboratorio ?? null);
      return;
    }
    setIdLaboratorioSeleccionado((actual) => actual ?? laboratorios[0]?.id_laboratorio ?? null);
  }, [esLaboratorista, usuario, laboratorios]);

  useEffect(() => {
    document.title = 'Pacientes de laboratorio · FarmaCom';
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get('q') || '';
  const pagina = Math.max(1, Number(searchParams.get('page')) || 1);
  const estadoParam = searchParams.get('estado');
  const estadoSeleccionado = ['activo', 'anulado'].includes(estadoParam) ? estadoParam : 'todos';

  const {
    pacientes,
    paginacion,
    resumenEstados,
    cargando,
    error,
    crear,
    actualizar,
    anular,
    eliminar,
  } = usePacientes({
    idLaboratorio: idLaboratorioSeleccionado,
    busqueda,
    estado: estadoSeleccionado === 'todos' ? undefined : estadoSeleccionado,
    pagina,
  });

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const [pacienteAAnular, setPacienteAAnular] = useState(null);
  const [anulando, setAnulando] = useState(false);
  const [pacienteAEliminar, setPacienteAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const {
    soportado: almacenamientoSoportado,
    cargando: cargandoAlmacenamiento,
    carpetaConfigurada,
    permisoOk,
    elegirCarpeta,
    reconectar,
    crearCarpetaDePaciente,
    eliminarCarpetaDePaciente,
  } = useAlmacenamientoLocal();
  const [mostrarModalAlmacenamiento, setMostrarModalAlmacenamiento] = useState(false);

  useEffect(() => {
    if (cargandoAlmacenamiento) return;
    if (!almacenamientoSoportado) return;
    setMostrarModalAlmacenamiento(!carpetaConfigurada || !permisoOk);
  }, [cargandoAlmacenamiento, almacenamientoSoportado, carpetaConfigurada, permisoOk]);

  useEffect(() => {
    if (!mensajeExito) return undefined;
    const temporizador = setTimeout(() => setMensajeExito(null), 4000);
    return () => clearTimeout(temporizador);
  }, [mensajeExito]);

  const totalPacientes = useMemo(
    () => resumenEstados.activos + resumenEstados.anulados,
    [resumenEstados],
  );

  const actualizarParametros = (cambios) => {
    setSearchParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      Object.entries(cambios).forEach(([clave, valor]) => {
        if (valor === '' || valor === null || valor === undefined || valor === 'todos') {
          siguientes.delete(clave);
        } else {
          siguientes.set(clave, String(valor));
        }
      });
      return siguientes;
    }, { replace: true });
  };

  const seleccionarEstado = (estado) => {
    ejecutarTransicionDeVista(() => actualizarParametros({ estado, page: 1 }));
  };

  const abrirCrear = () => {
    setModoEdicion(false);
    setPacienteEditando(null);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const abrirEditar = (paciente) => {
    setModoEdicion(true);
    setPacienteEditando(paciente);
    setErrorFormulario(null);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
  };

  const manejarGuardar = async (datos) => {
    try {
      setGuardando(true);
      setErrorFormulario(null);
      if (modoEdicion && pacienteEditando) {
        await actualizar(pacienteEditando.id_paciente, datos);
        setMensajeExito('Paciente actualizado correctamente.');
      } else {
        const paciente = await crear(datos);
        await crearCarpetaDePaciente(paciente.id_paciente, paciente.nombre_paciente);
        setMensajeExito('Paciente registrado correctamente.');
      }
      setMostrarModal(false);
    } catch (err) {
      setErrorFormulario(err.message || 'No se pudo guardar el paciente.');
    } finally {
      setGuardando(false);
    }
  };

  const solicitarAnular = (paciente) => {
    setErrorAccion(null);
    setPacienteAAnular(paciente);
  };

  const cerrarModalAnular = () => {
    if (anulando) return;
    setPacienteAAnular(null);
  };

  const confirmarAnular = async (motivo) => {
    if (!pacienteAAnular) return;
    try {
      setAnulando(true);
      setErrorAccion(null);
      await anular(pacienteAAnular.id_paciente, motivo);
      setPacienteAAnular(null);
      setMensajeExito('Paciente anulado correctamente.');
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo anular el paciente.');
    } finally {
      setAnulando(false);
    }
  };

  const solicitarEliminar = (paciente) => {
    setErrorAccion(null);
    setPacienteAEliminar(paciente);
  };

  const cerrarModalEliminar = () => {
    if (eliminando) return;
    setPacienteAEliminar(null);
  };

  const confirmarEliminar = async () => {
    if (!pacienteAEliminar) return;
    try {
      setEliminando(true);
      setErrorAccion(null);
      await eliminar(pacienteAEliminar.id_paciente);
      await eliminarCarpetaDePaciente(pacienteAEliminar.id_paciente, pacienteAEliminar.nombre_paciente);
      setPacienteAEliminar(null);
      setMensajeExito('Paciente eliminado correctamente.');
    } catch (err) {
      setErrorAccion(err.message || 'No se pudo eliminar el paciente.');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <section className={`${management.page} ${management.locationPage}`} aria-labelledby="pacientes-title">
      <header className={management.heading}>
        <div>
          <h1 id="pacientes-title">Pacientes</h1>
          <p>Consulta expedientes, resultados y estado de los pacientes del laboratorio.</p>
        </div>
        {!esLaboratorista && laboratorios.length > 1 && (
          <select
            value={idLaboratorioSeleccionado || ''}
            onChange={(e) => setIdLaboratorioSeleccionado(Number(e.target.value))}
            className={laboratory.laboratorySelect}
            aria-label="Laboratorio"
          >
            {laboratorios.map((laboratorio) => (
              <option key={laboratorio.id_laboratorio} value={laboratorio.id_laboratorio}>
                {laboratorio.nombre_laboratorio}
              </option>
            ))}
          </select>
        )}
      </header>

      <PacienteStatsGrid
        totalPacientes={totalPacientes}
        totalActivos={resumenEstados.activos}
        totalAnulados={resumenEstados.anulados}
        estadoSeleccionado={estadoSeleccionado}
        onSeleccionarEstado={seleccionarEstado}
      />

      <PacienteActionBar
        busqueda={busqueda}
        onBusquedaChange={(e) => actualizarParametros({ q: e.target.value, page: 1 })}
        onCrear={abrirCrear}
      />

      <p className={management.resultCount} aria-live="polite">
        <strong>{paginacion.total}</strong> pacientes encontrados
      </p>

      <PacienteAlert mensaje={mensajeExito} variante="success" />
      <PacienteAlert mensaje={error} />
      <PacienteAlert mensaje={errorAccion} />

      <PacienteTable
        cargando={cargando}
        pacientes={pacientes}
        onEditar={abrirEditar}
        onAnular={solicitarAnular}
        onEliminar={solicitarEliminar}
      />

      {paginacion.total_paginas > 1 && (
        <nav className={laboratory.pagination} aria-label="Paginación de pacientes">
          <button
            type="button"
            disabled={pagina <= 1}
            onClick={() => actualizarParametros({ page: Math.max(1, pagina - 1) })}
            className={management.button}
          >
            Anterior
          </button>
          <span className={laboratory.paginationInfo}>
            Página {paginacion.pagina} de {paginacion.total_paginas}
          </span>
          <button
            type="button"
            disabled={pagina >= paginacion.total_paginas}
            onClick={() => actualizarParametros({ page: pagina + 1 })}
            className={management.button}
          >
            Siguiente
          </button>
        </nav>
      )}

      <PacienteFormModal
        isOpen={mostrarModal}
        modoEdicion={modoEdicion}
        paciente={pacienteEditando}
        guardando={guardando}
        errorFormulario={errorFormulario}
        onClose={cerrarModal}
        onSubmit={manejarGuardar}
      />

      <PacienteAnularModal
        isOpen={Boolean(pacienteAAnular)}
        paciente={pacienteAAnular}
        anulando={anulando}
        onClose={cerrarModalAnular}
        onConfirm={confirmarAnular}
      />

      <PacienteEliminarModal
        isOpen={Boolean(pacienteAEliminar)}
        paciente={pacienteAEliminar}
        eliminando={eliminando}
        onClose={cerrarModalEliminar}
        onConfirm={confirmarEliminar}
      />

      <ConfiguracionAlmacenamientoModal
        isOpen={mostrarModalAlmacenamiento}
        soportado={almacenamientoSoportado}
        carpetaConfigurada={carpetaConfigurada}
        onElegir={elegirCarpeta}
        onReconectar={reconectar}
        onClose={() => setMostrarModalAlmacenamiento(false)}
      />
    </section>
  );
}
