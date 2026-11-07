import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
const posiciones = new Map();
export default function useScrollListado(listo) {
  const location = useLocation();
  const tipo = useNavigationType();
  useEffect(() => {
    const guardar = () => {
      posiciones.set(location.key, window.scrollY);
      if (posiciones.size > 100) posiciones.delete(posiciones.keys().next().value);
    };
    window.addEventListener('scroll', guardar, { passive: true });
    return () => window.removeEventListener('scroll', guardar);
  }, [location.key]);
  useEffect(() => {
    const entrada = tipo === 'POP' ? location.key : location.state?.entradaListado;
    if (listo && posiciones.has(entrada)) window.scrollTo(0, posiciones.get(entrada));
  }, [location.key, location.state, tipo, listo]);
}
