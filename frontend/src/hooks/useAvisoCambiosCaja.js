import { useEffect } from 'react';

export const confirmarDescartarCambiosCaja = () => window.confirm('Hay cambios sin guardar. ¿Deseas descartarlos?');

export default function useAvisoCambiosCaja(hayCambios) {
  useEffect(() => {
    if (!hayCambios) return undefined;
    const alSalir = (evento) => { evento.preventDefault(); evento.returnValue = ''; };
    const alNavegar = (evento) => {
      const enlace = evento.target.closest('a[href]');
      if (!enlace || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey || enlace.target === '_blank') return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.pathname === window.location.pathname && destino.search === window.location.search) return;
      if (!confirmarDescartarCambiosCaja()) { evento.preventDefault(); evento.stopPropagation(); }
    };
    window.addEventListener('beforeunload', alSalir);
    document.addEventListener('click', alNavegar, true);
    return () => { window.removeEventListener('beforeunload', alSalir); document.removeEventListener('click', alNavegar, true); };
  }, [hayCambios]);
}
