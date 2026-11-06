import { useContext, useEffect } from 'react';
import { UNSAFE_NavigationContext, UNSAFE_LocationContext } from 'react-router-dom';
import useAvisoCambiosSinGuardar, { confirmarDescartarCambios } from './useAvisoCambiosSinGuardar';

let proteccion = null;
let instalada = false;
// Se instala antes de BrowserRouter: debe poder detener popstate antes de que
// el router desmonte el formulario y pierda sus valores.
export function instalarAvisoCambiosResumen() {
  if (instalada || typeof window === 'undefined') return;
  instalada = true;
  window.addEventListener('popstate', (event) => {
    const guardia = proteccion;
    if (!guardia) return;
    if (guardia.regresando) { guardia.regresando = false; return; }
    const siguiente = event.state?.idx;
    if (!Number.isInteger(guardia.indice) || !Number.isInteger(siguiente) || siguiente === guardia.indice) return;
    if (window.location.pathname === guardia.pathname || confirmarDescartarCambios()) return;
    event.stopImmediatePropagation();
    guardia.regresando = true;
    window.history.go(guardia.indice - siguiente);
  }, true);
}

// BrowserRouter no usa el bloqueador del data router. Protege tanto los enlaces
// de la aplicación como Atrás/Adelante, sin cambiar el enrutador del proyecto.
export default function useAvisoCambiosResumen(dirty) {
  const navigator = useContext(UNSAFE_NavigationContext)?.navigator;
  const location = useContext(UNSAFE_LocationContext)?.location;
  const pathname = location?.pathname || window.location.pathname;
  const search = location?.search || '';
  useAvisoCambiosSinGuardar(dirty);
  useEffect(() => {
    if (!dirty) return undefined;
    instalarAvisoCambiosResumen();
    const guardia = { pathname, indice: window.history.state?.idx, regresando: false };
    proteccion = guardia;
    const alEnlaceExterno = event => {
      const enlace = event.target.closest?.('a[href]');
      if (!enlace || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || enlace.target === '_blank' || enlace.hasAttribute('download')) return;
      const url = new URL(enlace.href, window.location.href);
      if (navigator && url.origin === window.location.origin) return;
      if (url.pathname === pathname && url.search === search && url.origin === window.location.origin) return;
      if (!confirmarDescartarCambios()) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener('click', alEnlaceExterno, true);
    const originales = {};
    const wrappers = {};
    for (const metodo of ['push', 'replace']) {
      if (!navigator) break;
      originales[metodo] = navigator[metodo];
      wrappers[metodo] = (to, ...args) => {
        const destino = typeof to === 'string' ? new URL(to, window.location.href).pathname : to.pathname || pathname;
        if (destino !== pathname && !confirmarDescartarCambios()) return;
        originales[metodo].call(navigator, to, ...args);
      };
      navigator[metodo] = wrappers[metodo];
    }
    return () => {
      document.removeEventListener('click', alEnlaceExterno, true);
      for (const metodo of ['push', 'replace']) if (navigator && navigator[metodo] === wrappers[metodo]) navigator[metodo] = originales[metodo];
      if (proteccion === guardia) proteccion = null;
    };
  }, [dirty, navigator, pathname, search]);
}
