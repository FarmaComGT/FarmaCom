import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PlusCircle, User } from 'lucide-react';
import { obtenerPaciente } from '../../api/pacientes';
import useResultadosLaboratorio from '../../hooks/useResultadosLaboratorio';
import useCategoriasSugeridas from '../../hooks/useCategoriasSugeridas';
import PacienteAlert from '../../components/laboratorio/pacientes/PacienteAlert.jsx';
import ResultadoCard from '../../components/laboratorio/resultados/ResultadoCard.jsx';
import ResultadoEmptyState from '../../components/laboratorio/resultados/ResultadoEmptyState.jsx';
import ResultadoUploadModal from '../../components/laboratorio/resultados/ResultadoUploadModal.jsx';
import ResultadoAnularModal from '../../components/laboratorio/resultados/ResultadoAnularModal.jsx';

const ETIQUETAS_SEXO = { M: 'Masculino', F: 'Femenino', Otro: 'Otro' };

const formatearFecha = (fecha) => (fecha ? new Date(fecha).toLocaleDateString('es-GT') : '—');

export default function PacientePerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarPaciente = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerPaciente(id);
      setPaciente(data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo cargar el paciente.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargarPaciente();
  }, [cargarPaciente]);

  const {
    resultados,
    cargando: cargandoResultados,
    error: errorResultados,
    subir,
    anular: anularResultado,
  } = useResultadosLaboratorio(id);
  const categoriasSugeridas = useCategoriasSugeridas(paciente?.id_laboratorio);

  const [mostrarModalSubida, setMostrarModalSubida] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState(null);
  const [resultadoAAnular, setResultadoAAnular] = useState(null);
  const [anulandoResultado, setAnulandoResultado] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  useEffect(() => {
    if (!mensajeExito) return undefined;
    const temporizador = setTimeout(() => setMensajeExito(null), 4000);
    return () => clearTimeout(temporizador);
  }, [mensajeExito]);

  const abrirModalSubida = () => {
    setErrorSubida(null);
    setMostrarModalSubida(true);
  };

  const cerrarModalSubida = () => {
    if (subiendo) return;
    setMostrarModalSubida(false);
  };

  const manejarSubir = async (datos) => {
    try {
      setSubiendo(true);
      setErrorSubida(null);
      await subir(datos);
      setMostrarModalSubida(false);
      setMensajeExito('Resultado subido correctamente.');
    } catch (err) {
      setErrorSubida(err.message || 'No se pudo subir el resultado.');
    } finally {
      setSubiendo(false);
    }
  };

  const solicitarAnularResultado = (resultado) => {
    setErrorAnulacion(null);
    setResultadoAAnular(resultado);
  };

  const cerrarModalAnularResultado = () => {
    if (anulandoResultado) return;
    setResultadoAAnular(null);
  };

  const confirmarAnularResultado = async (motivo) => {
    if (!resultadoAAnular) return;
    try {
      setAnulandoResultado(true);
      setErrorAnulacion(null);
      await anularResultado(resultadoAAnular.id_resultado, motivo);
      setResultadoAAnular(null);
      setMensajeExito('Resultado anulado correctamente.');
    } catch (err) {
      setErrorAnulacion(err.message || 'No se pudo anular el resultado.');
    } finally {
      setAnulandoResultado(false);
    }
  };

  if (cargando) {
    return <div className="p-8 text-center text-slate-500 font-medium">Cargando paciente...</div>;
  }

  if (error || !paciente) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <div className="bg-error-container/40 border border-error/20 rounded-xl px-4 py-3 text-sm text-on-error-container font-medium">
          {error || 'Paciente no encontrado.'}
        </div>
      </div>
    );
  }

  const chips = [
    { etiqueta: 'Edad', valor: paciente.edad != null ? `${paciente.edad} años` : '—' },
    { etiqueta: 'Sexo', valor: ETIQUETAS_SEXO[paciente.sexo] || paciente.sexo },
    paciente.dpi ? { etiqueta: 'DPI', valor: paciente.dpi } : null,
    paciente.telefono ? { etiqueta: 'Teléfono', valor: paciente.telefono } : null,
    { etiqueta: 'Registrado', valor: formatearFecha(paciente.fecha_registro) },
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a pacientes
      </button>

      <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <span className="inline-flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="w-8 h-8" />
          </span>
          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-extrabold text-on-surface">{paciente.nombre_paciente}</h2>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip.etiqueta}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200"
                >
                  <span className="text-slate-400">{chip.etiqueta}:</span> {chip.valor}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={abrirModalSubida}
          className="px-6 py-3 bg-linear-to-br from-primary to-primary-container text-white font-headline font-bold text-sm rounded-xl shadow-[0_4px_12px_rgba(0,81,71,0.25)] hover:shadow-[0_6px_20px_rgba(0,81,71,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 justify-center flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo resultado
        </button>
      </div>

      <PacienteAlert mensaje={mensajeExito} variante="success" />
      <PacienteAlert mensaje={errorResultados} />
      <PacienteAlert mensaje={errorAnulacion} />

      {cargandoResultados ? (
        <div className="p-8 text-center text-slate-500 font-medium">Cargando resultados...</div>
      ) : resultados.length === 0 ? (
        <ResultadoEmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {resultados.map((resultado) => (
            <ResultadoCard
              key={resultado.id_resultado}
              resultado={resultado}
              onAnular={solicitarAnularResultado}
            />
          ))}
        </div>
      )}

      <ResultadoUploadModal
        isOpen={mostrarModalSubida}
        categoriasSugeridas={categoriasSugeridas}
        subiendo={subiendo}
        errorFormulario={errorSubida}
        onClose={cerrarModalSubida}
        onSubmit={manejarSubir}
      />

      <ResultadoAnularModal
        isOpen={Boolean(resultadoAAnular)}
        resultado={resultadoAAnular}
        anulando={anulandoResultado}
        onClose={cerrarModalAnularResultado}
        onConfirm={confirmarAnularResultado}
      />
    </div>
  );
}
