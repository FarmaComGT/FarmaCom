import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import useLaboratorios from '../../hooks/useLaboratorios';
import usePacientes from '../../hooks/usePacientes';
import PacienteActionBar from '../../components/laboratorio/pacientes/PacienteActionBar.jsx';
import PacienteStatsGrid from '../../components/laboratorio/pacientes/PacienteStatsGrid.jsx';
import PacienteAlert from '../../components/laboratorio/pacientes/PacienteAlert.jsx';
import PacienteTable from '../../components/laboratorio/pacientes/PacienteTable.jsx';
import PacienteFormModal from '../../components/laboratorio/pacientes/PacienteFormModal.jsx';
import PacienteAnularModal from '../../components/laboratorio/pacientes/PacienteAnularModal.jsx';

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

  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const {
    pacientes,
    paginacion,
    resumenEstados,
    cargando,
    error,
    crear,
    actualizar,
    anular,
  } = usePacientes({ idLaboratorio: idLaboratorioSeleccionado, busqueda, pagina });

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const [pacienteAAnular, setPacienteAAnular] = useState(null);
  const [anulando, setAnulando] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  useEffect(() => {
    if (!mensajeExito) return undefined;
    const temporizador = setTimeout(() => setMensajeExito(null), 4000);
    return () => clearTimeout(temporizador);
  }, [mensajeExito]);

  const totalPacientes = useMemo(
    () => resumenEstados.activos + resumenEstados.anulados,
    [resumenEstados],
  );

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
        await crear(datos);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-headline text-3xl font-extrabold text-on-surface">Pacientes</h2>
        {!esLaboratorista && laboratorios.length > 1 && (
          <select
            value={idLaboratorioSeleccionado || ''}
            onChange={(e) => setIdLaboratorioSeleccionado(Number(e.target.value))}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {laboratorios.map((laboratorio) => (
              <option key={laboratorio.id_laboratorio} value={laboratorio.id_laboratorio}>
                {laboratorio.nombre_laboratorio}
              </option>
            ))}
          </select>
        )}
      </div>

      <PacienteStatsGrid
        totalPacientes={totalPacientes}
        totalActivos={resumenEstados.activos}
        totalAnulados={resumenEstados.anulados}
      />

      <PacienteActionBar
        busqueda={busqueda}
        onBusquedaChange={(e) => {
          setBusqueda(e.target.value);
          setPagina(1);
        }}
        onCrear={abrirCrear}
      />

      <PacienteAlert mensaje={mensajeExito} variante="success" />
      <PacienteAlert mensaje={error} />
      <PacienteAlert mensaje={errorAccion} />

      <PacienteTable
        cargando={cargando}
        pacientes={pacientes}
        onEditar={abrirEditar}
        onAnular={solicitarAnular}
      />

      {paginacion.total_paginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-600">
            Página {paginacion.pagina} de {paginacion.total_paginas}
          </span>
          <button
            type="button"
            disabled={pagina >= paginacion.total_paginas}
            onClick={() => setPagina((p) => p + 1)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
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
    </div>
  );
}
