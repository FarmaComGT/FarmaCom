import { useEffect } from 'react';

export const confirmarDescartarCambios = () => (
  window.confirm('Hay cambios sin guardar. ¿Deseas descartarlos?')
);

export default function useAvisoCambiosSinGuardar(hayCambios) {
  useEffect(() => {
    if (!hayCambios) return undefined;

    const avisarAntesDeSalir = (evento) => {
      evento.preventDefault();
      evento.returnValue = '';
    };

    window.addEventListener('beforeunload', avisarAntesDeSalir);
    return () => window.removeEventListener('beforeunload', avisarAntesDeSalir);
  }, [hayCambios]);
}
