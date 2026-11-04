import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ToastViewport from '../components/ui/ToastViewport.jsx';

const ToastContext = createContext(null);
const TIPOS = ['success', 'error', 'warning', 'info'];
const DURACIONES = { success: 5000, error: 10000, warning: 0, info: 5000 };

export function ToastProvider({ children }) {
  const [mensajes, setMensajes] = useState([]);
  const cerrar = useCallback((id) => {
    setMensajes((actuales) => actuales.filter((mensaje) => mensaje.id !== id));
  }, []);
  const mostrar = useCallback((texto, { tipo = 'info', duracion } = {}) => {
    if (typeof texto !== 'string' || !texto.trim()) return;
    const variante = TIPOS.includes(tipo) ? tipo : 'info';
    const id = `${variante}:${texto.trim()}`;
    const tiempo = Number.isFinite(duracion) && duracion >= 0
      ? duracion : DURACIONES[variante];
    setMensajes((actuales) => {
      // Una misma operación no debe llenar la cola con avisos idénticos.
      if (actuales.some((mensaje) => mensaje.texto === texto.trim() && mensaje.tipo === variante)) return actuales;
      return [...actuales, { id, texto: texto.trim(), tipo: variante, duracion: tiempo }];
    });
    return id;
  }, []);
  const api = useMemo(() => ({
    mostrar,
    cerrar,
    success: (texto, opciones) => mostrar(texto, { ...opciones, tipo: 'success' }),
    error: (texto, opciones) => mostrar(texto, { ...opciones, tipo: 'error' }),
    warning: (texto, opciones) => mostrar(texto, { ...opciones, tipo: 'warning' }),
    info: (texto, opciones) => mostrar(texto, { ...opciones, tipo: 'info' }),
  }), [mostrar, cerrar]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport mensajes={mensajes.slice(0, 3)} cerrar={cerrar} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  return contexto;
}
