import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';

export default function usePaginacionURL({ prefijo = '', paginacion, cargando = false } = {}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const campoPagina = `${prefijo}pagina`;
  const campoLimite = `${prefijo}limite`;
  const numero = Number(params.get(campoPagina));
  const pagina = Number.isSafeInteger(numero) && numero > 0 && numero <= 2147483647 ? numero : 1;
  const limite = [10, 25, 50].includes(Number(params.get(campoLimite))) ? Number(params.get(campoLimite)) : 25;
  const actualizar = useCallback((cambios, replace = false) => {
    setParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.delete(campoPagina);
      Object.entries(cambios).forEach(([campo, valor]) => {
        if (valor === '' || valor == null) siguientes.delete(campo);
        else siguientes.set(campo, String(valor));
      });
      return siguientes;
    }, { replace });
  }, [setParams, campoPagina]);
  useEffect(() => {
    if (!cargando && paginacion && paginacion.pagina !== pagina) {
      actualizar({ [campoPagina]: paginacion.pagina }, true);
    }
  }, [cargando, paginacion, pagina, campoPagina, actualizar]);
  const posiciones = useRef(new Map());
  useEffect(() => {
    const guardar = () => posiciones.current.set(location.key, window.scrollY);
    window.addEventListener('scroll', guardar, { passive: true });
    return () => window.removeEventListener('scroll', guardar);
  }, [location.key]);
  useEffect(() => {
    if (navigationType === 'POP' && !cargando && paginacion && posiciones.current.has(location.key)) {
      window.scrollTo(0, posiciones.current.get(location.key));
    }
  }, [navigationType, location.key, cargando, paginacion]);
  const crearDestino = (valor) => {
    const siguientes = new URLSearchParams(params);
    siguientes.set(campoPagina, String(valor));
    return `${location.pathname}?${siguientes}${location.hash}`;
  };
  return { pagina, limite, actualizar, crearDestino,
    onLimiteChange: (valor) => actualizar({ [campoLimite]: valor }) };
}
