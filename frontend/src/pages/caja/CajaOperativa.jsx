import React, { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useCaja from '../../hooks/useCaja';

const FORMULARIO_INICIAL = {
  turno: '',
  fondo_inicial: '',
};

const esMontoValido = (valor) => (
  /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(valor)
  && Number(valor) <= 9999999999.99
);

export default function CajaOperativa() {
  const { sucursalActivaId } = useAuth();
  const {
    cajas,
    cajaSeleccionada,
    idCajaSeleccionada,
    sesionActual,
    cargandoCajas,
    cargandoSesion,
    procesando,
    error,
    seleccionarCaja,
    abrir,
    limpiarError,
  } = useCaja(sucursalActivaId);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  const cambiarCaja = (evento) => {
    seleccionarCaja(evento.target.value || null);
    setFormulario(FORMULARIO_INICIAL);
    setErrorFormulario(null);
    setMensajeExito(null);
    limpiarError();
  };

  const actualizarCampo = (evento) => {
    setFormulario((actual) => ({
      ...actual,
      [evento.target.name]: evento.target.value,
    }));
    setErrorFormulario(null);
    setMensajeExito(null);
  };

  const abrirTurno = async (evento) => {
    evento.preventDefault();
    const fondoInicial = formulario.fondo_inicial.trim();

    if (!formulario.turno) {
      setErrorFormulario('Selecciona el turno que deseas abrir.');
      return;
    }

    if (!esMontoValido(fondoInicial)) {
      setErrorFormulario('Ingresa un fondo inicial válido con máximo dos decimales.');
      return;
    }

    try {
      setErrorFormulario(null);
      await abrir({
        turno: formulario.turno,
        fondo_inicial: fondoInicial,
      });
      setMensajeExito('La sesión de caja se abrió correctamente.');
    } catch {
      // El hook expone el mensaje enviado por el backend.
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-surface-container-low/70 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Banknote className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-headline text-xl font-extrabold text-primary">
              Operación de caja
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Selecciona una caja para iniciar o continuar tu turno.
            </p>
          </div>
        </div>
      </header>

      {!sucursalActivaId && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
          Debes tener una sucursal activa para operar una caja.
        </div>
      )}

      {(error || errorFormulario) && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorFormulario || error}
        </div>
      )}

      {mensajeExito && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          {mensajeExito}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-headline text-lg font-bold text-primary">Seleccionar caja</h2>
        </div>

        <label htmlFor="selector-caja" className="text-sm font-semibold text-slate-700">
          Caja disponible
        </label>
        <div className="relative mt-1">
          <select
            id="selector-caja"
            value={idCajaSeleccionada || ''}
            onChange={cambiarCaja}
            disabled={!sucursalActivaId || cargandoCajas || cajas.length === 0}
            className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {cargandoCajas ? 'Cargando cajas...' : 'Selecciona una caja'}
            </option>
            {cajas.map((caja) => (
              <option key={caja.id_caja} value={caja.id_caja}>
                {caja.nombre}
                {caja.id_sesion_abierta ? ' — turno abierto' : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
        </div>

        {!cargandoCajas && sucursalActivaId && cajas.length === 0 && !error && (
          <p className="mt-3 text-sm text-slate-500">
            No hay cajas activas disponibles en esta sucursal.
          </p>
        )}
      </section>

      {idCajaSeleccionada && cargandoSesion && (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center text-sm font-medium text-slate-500">
          Consultando la sesión actual...
        </div>
      )}

      {cajaSeleccionada && !cargandoSesion && sesionActual && (
        <section className="rounded-2xl border border-primary/15 bg-surface-container-low/70 p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="font-headline text-lg font-bold text-primary">
                Turno abierto en {cajaSeleccionada.nombre}
              </h2>
              <p className="mt-1 text-sm font-medium capitalize text-slate-500">
                Turno {sesionActual.turno}
              </p>
            </div>
          </div>
        </section>
      )}

      {cajaSeleccionada && !cargandoSesion && !sesionActual && (
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
          <h2 className="font-headline text-lg font-bold text-primary">
            Abrir turno en {cajaSeleccionada.nombre}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Registra el turno y el efectivo disponible al iniciar.
          </p>

          <form onSubmit={abrirTurno} className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="turno-caja" className="text-sm font-semibold text-slate-700">
                Turno
              </label>
              <div className="relative mt-1">
                <select
                  id="turno-caja"
                  name="turno"
                  value={formulario.turno}
                  onChange={actualizarCampo}
                  disabled={procesando}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-sm outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">Selecciona un turno</option>
                  <option value="mañana">Mañana</option>
                  <option value="tarde">Tarde</option>
                  <option value="noche">Noche</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div>
              <label htmlFor="fondo-inicial" className="text-sm font-semibold text-slate-700">
                Fondo inicial
              </label>
              <div className="relative mt-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  Q
                </span>
                <input
                  id="fondo-inicial"
                  name="fondo_inicial"
                  type="text"
                  inputMode="decimal"
                  value={formulario.fondo_inicial}
                  onChange={actualizarCampo}
                  disabled={procesando}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 py-3 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="md:col-span-2 md:flex md:justify-end">
              <button
                type="submit"
                disabled={procesando}
                className="w-full cursor-pointer rounded-xl bg-primary px-6 py-3 font-headline text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 md:w-auto"
              >
                {procesando ? 'Abriendo turno...' : 'Abrir turno'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
