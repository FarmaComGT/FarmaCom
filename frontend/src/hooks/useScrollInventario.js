import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Sobrevive al desmontaje al visitar lotes; se limita para sesiones largas.
const posiciones = new Map();

export default function useScrollInventario(listo) {
  const location = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    const guardar = () => {
      posiciones.set(location.key, window.scrollY);
      if (posiciones.size > 100) posiciones.delete(posiciones.keys().next().value);
    };
    window.addEventListener('scroll', guardar, { passive: true });
    return () => window.removeEventListener('scroll', guardar);
  }, [location.key]);
  useEffect(() => {
    const entrada = navigationType === 'POP' ? location.key : location.state?.entradaInventario;
    if (listo && posiciones.has(entrada)) window.scrollTo(0, posiciones.get(entrada));
  }, [location.key, location.state, navigationType, listo]);
}
