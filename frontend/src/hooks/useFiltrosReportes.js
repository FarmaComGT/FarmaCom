import { useCallback, useState } from 'react';
import {
  crearFiltrosInicialesReporte,
  prepararFiltrosReporte,
  validarFiltrosReporte,
} from '../utils/filtrosReportes';

export default function useFiltrosReportes(fechaReferencia) {
  const [filtrosEdicion, setFiltrosEdicion] = useState(() => (
    crearFiltrosInicialesReporte(fechaReferencia)
  ));
  const [filtrosAplicados, setFiltrosAplicados] = useState(() => (
    prepararFiltrosReporte(crearFiltrosInicialesReporte(fechaReferencia))
  ));
  const [errorFiltros, setErrorFiltros] = useState(null);

  const actualizarFiltro = useCallback((campo, valor) => {
    setFiltrosEdicion((actuales) => ({
      ...actuales,
      [campo]: valor,
    }));
    setErrorFiltros(null);
  }, []);

  const aplicarFiltros = useCallback((cambios = {}) => {
    const siguientesFiltros = { ...filtrosEdicion, ...cambios };
    const mensajeError = validarFiltrosReporte(siguientesFiltros);

    if (mensajeError) {
      setErrorFiltros(mensajeError);
      return false;
    }

    setFiltrosEdicion(siguientesFiltros);
    setFiltrosAplicados(prepararFiltrosReporte(siguientesFiltros));
    setErrorFiltros(null);
    return true;
  }, [filtrosEdicion]);

  const cambiarCriterio = useCallback((criterio) => {
    if (!['cantidad', 'ingresos'].includes(criterio)) return;
    setFiltrosEdicion((actuales) => ({ ...actuales, criterio }));
    setFiltrosAplicados((actuales) => ({ ...actuales, criterio }));
  }, []);

  const restablecerFiltros = useCallback(() => {
    const filtrosIniciales = crearFiltrosInicialesReporte(fechaReferencia);
    setFiltrosEdicion(filtrosIniciales);
    setFiltrosAplicados(prepararFiltrosReporte(filtrosIniciales));
    setErrorFiltros(null);
  }, [fechaReferencia]);

  return {
    filtrosEdicion,
    filtrosAplicados,
    errorFiltros,
    actualizarFiltro,
    aplicarFiltros,
    cambiarCriterio,
    restablecerFiltros,
  };
}
