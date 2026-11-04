import { useCallback, useEffect, useState } from 'react';
import {
  crearFiltrosInicialesHistorial,
  prepararFiltrosHistorial,
  validarFiltrosHistorial,
} from '../utils/filtrosHistorialVentas';

export default function useFiltrosHistorialVentas(fechaReferencia, { filtrosURL, guardarURL } = {}) {
  const crearIniciales = () => filtrosURL ?? crearFiltrosInicialesHistorial(fechaReferencia);
  const [filtrosEdicion, setFiltrosEdicion] = useState(crearIniciales);
  const [filtrosAplicados, setFiltrosAplicados] = useState(() => (
    prepararFiltrosHistorial(crearIniciales())
  ));
  const [errorFiltros, setErrorFiltros] = useState(null);
  const claveURL = filtrosURL ? JSON.stringify(filtrosURL) : null;
  useEffect(() => {
    if (claveURL !== null) {
      setFiltrosEdicion(JSON.parse(claveURL));
      setErrorFiltros(null);
    }
  }, [claveURL]);

  const actualizarFiltro = useCallback((campo, valor) => {
    setFiltrosEdicion((actuales) => ({ ...actuales, [campo]: valor }));
    setErrorFiltros(null);
  }, []);

  const aplicarFiltros = useCallback(() => {
    const error = validarFiltrosHistorial(filtrosEdicion);
    if (error) {
      setErrorFiltros(error);
      return false;
    }
    setFiltrosAplicados(prepararFiltrosHistorial(filtrosEdicion));
    guardarURL?.(filtrosEdicion);
    setErrorFiltros(null);
    return true;
  }, [filtrosEdicion, guardarURL]);

  const restablecerFiltros = useCallback(() => {
    const iniciales = crearFiltrosInicialesHistorial(fechaReferencia);
    setFiltrosEdicion(iniciales);
    setFiltrosAplicados(prepararFiltrosHistorial(iniciales));
    guardarURL?.(iniciales);
    setErrorFiltros(null);
  }, [fechaReferencia, guardarURL]);

  return {
    filtrosEdicion,
    filtrosAplicados: filtrosURL ? prepararFiltrosHistorial(filtrosURL) : filtrosAplicados,
    errorFiltros,
    actualizarFiltro,
    aplicarFiltros,
    restablecerFiltros,
  };
}
