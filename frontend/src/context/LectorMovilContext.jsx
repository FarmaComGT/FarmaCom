import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { acusarLectura, confirmarVinculacion, crearVinculacion, pulsoVinculacion, revocarVinculacion } from '../api/lectorMovil';
import LectorMovilDialog from '../components/ui/LectorMovilDialog';

const Contexto = createContext(null);
// getRandomValues también está disponible al abrir la aplicación por HTTP en
// una red local; randomUUID puede faltar fuera de un contexto seguro.
const nuevaRevision = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((valor) => valor.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
export const nombresDestino = { ventas: 'Punto de venta', producto: 'Registro de producto', pausa: 'En pausa' };
export const useLectorMovil = () => useContext(Contexto);

export function LectorMovilAutenticadoProvider({ children }) {
  const { usuario, sucursalActivaId, status } = useAuth();
  const habilitado = status === 'authenticated' && ['dueno', 'administrador', 'dependiente'].includes(usuario?.rol);
  const identidad = habilitado ? `${usuario.id_usuario}:${sucursalActivaId ?? usuario.id_sucursal}:${usuario.token_version ?? 0}` : 'sin-sesion';
  return <LectorMovilProvider identidad={identidad} habilitado={habilitado}>{children}</LectorMovilProvider>;
}

export function LectorMovilProvider({ children, habilitado = true, identidad = 'prueba' }) {
  const [sesion, setSesion] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [destino, setDestino] = useState('pausa');
  const actual = useRef(null);
  const revision = useRef(0);
  const creando = useRef(false);
  const receptores = useRef(new Map());
  const [pausaInicial] = useState(() => ({ id: nuevaRevision(), destino: 'pausa' }));
  const receptor = useRef(pausaInicial);
  const ultimaLectura = useRef(null);

  const registrar = useCallback((destinoNuevo, opciones) => {
    const id = nuevaRevision();
    const nuevo = { id, destino: destinoNuevo, opciones };
    receptores.current.set(id, nuevo);
    receptor.current = nuevo;
    setDestino(destinoNuevo);
    return () => {
      receptores.current.delete(id);
      if ((receptor.current.registro ?? receptor.current.id) !== id) return;
      // Restaurar un receptor anterior también genera una revisión nueva.
      const anterior = [...receptores.current.values()].at(-1);
      receptor.current = anterior ? { ...anterior, id: nuevaRevision() } : { id: nuevaRevision(), destino: 'pausa' };
      // La identidad del registro permite retirarlo aunque su revisión cambie.
      if (anterior) receptor.current.registro = anterior.id;
      setDestino(receptor.current.destino);
    };
  }, []);

  useLayoutEffect(() => {
    revision.current += 1; creando.current = false;
    setSesion(null); setAbierto(false); setCargando(false); setError('');
    return () => {
      revision.current += 1;
      const id = actual.current?.id;
      actual.current = null;
      if (id) void revocarVinculacion(id).catch(() => {});
    };
  }, [identidad]);

  useEffect(() => {
    if (!sesion?.id) return undefined;
    const id = sesion.id;
    const control = new AbortController();
    let timer;
    const consultar = async () => {
      const objetivo = receptor.current;
      const disponible = objetivo.destino !== 'pausa' && !objetivo.opciones.current.bloqueado;
      try {
        const datos = await pulsoVinculacion(id, disponible, control.signal, objetivo.id, objetivo.destino);
        if (control.signal.aborted || actual.current?.id !== id) return;
        // Una respuesta de la ruta anterior nunca se entrega al receptor nuevo.
        if (receptor.current.id === objetivo.id) {
          actual.current = { ...actual.current, ...datos, confirmado: actual.current.confirmado || datos.confirmado };
          setSesion(actual.current); setError('');
          if (datos.lectura && disponible && !objetivo.opciones.current.bloqueado) {
            if (ultimaLectura.current !== datos.lectura.id) {
              ultimaLectura.current = datos.lectura.id;
              setAbierto(false);
              await objetivo.opciones.current.onCodigo(datos.lectura.codigo);
            }
            if (!control.signal.aborted && receptor.current.id === objetivo.id && actual.current?.id === id) await acusarLectura(id, datos.lectura.id);
          }
        }
      } catch (fallo) {
        if (control.signal.aborted) return;
        setError(fallo.response?.data?.mensaje || 'Se perdió la conexión con el celular. Reintentando…');
        if ([401, 403, 410].includes(fallo.response?.status)) { actual.current = null; setSesion(null); return; }
      }
      if (!control.signal.aborted) timer = setTimeout(consultar, 1000);
    };
    void consultar();
    return () => { control.abort(); clearTimeout(timer); };
  }, [sesion?.id, identidad]);

  const desconectar = useCallback(() => {
    revision.current += 1; creando.current = false;
    const id = actual.current?.id;
    actual.current = null; setSesion(null); setAbierto(false); setCargando(false); setError('');
    if (id) void revocarVinculacion(id).catch(() => {});
  }, []);
  const abrir = useCallback(async () => {
    if (!habilitado) return;
    setAbierto(true); setError('');
    if (actual.current || creando.current) return;
    if (receptor.current.destino === 'pausa') return;
    const version = revision.current;
    creando.current = true; setCargando(true);
    try {
      const datos = await crearVinculacion(receptor.current.destino);
      if (version !== revision.current) { void revocarVinculacion(datos.id).catch(() => {}); return; }
      ultimaLectura.current = null; actual.current = datos; setSesion(datos);
    } catch (fallo) {
      if (version === revision.current) setError([426, 503].includes(fallo.response?.status)
        ? 'La conexión con el celular todavía no está habilitada. Pide al encargado que complete la configuración inicial.'
        : fallo.response?.data?.mensaje || 'No se pudo conectar el teléfono. Intenta de nuevo.');
    } finally { if (version === revision.current) { creando.current = false; setCargando(false); } }
  }, [habilitado]);
  const cerrar = () => { if (!actual.current?.confirmado) desconectar(); else setAbierto(false); };
  const confirmar = async () => {
    const id = actual.current?.id;
    if (!id) return;
    setCargando(true);
    try {
      const datos = await confirmarVinculacion(id);
      if (actual.current?.id === id) { actual.current = { ...actual.current, ...datos }; setSesion(actual.current); setAbierto(false); }
    } catch (fallo) { if (actual.current?.id === id) setError(fallo.response?.data?.mensaje || 'No se pudo confirmar el teléfono.'); }
    finally { if (actual.current?.id === id) setCargando(false); }
  };
  return <Contexto.Provider value={{ sesion, destino, habilitado, registrar, abrir }}>
    {children}
    <LectorMovilDialog {...{ abierto, sesion, cargando, error, abrir, cerrar, desconectar, confirmar, destino }} />
  </Contexto.Provider>;
}
