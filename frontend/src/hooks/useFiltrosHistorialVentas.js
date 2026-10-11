import { useCallback, useState } from 'react';
import {
  crearFiltrosInicialesHistorial,
  prepararFiltrosHistorial,
  validarFiltrosHistorial,
} from '../utils/filtrosHistorialVentas';

export default function useFiltrosHistorialVentas(fechaReferencia) {
  const crearIniciales = () => crearFiltrosInicialesHistorial(fechaReferencia);
  const [filtrosEdicion, setFiltrosEdicion] = useState(crearIniciales);
  const [filtrosAplicados, setFiltrosAplicados] = useState(() => (
    prepararFiltrosHistorial(crearIniciales())
  ));
  const [errorFiltros, setErrorFiltros] = useState(null);

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
    setErrorFiltros(null);
    return true;
  }, [filtrosEdicion]);

  const restablecerFiltros = useCallback(() => {
    const iniciales = crearFiltrosInicialesHistorial(fechaReferencia);
    setFiltrosEdicion(iniciales);
    setFiltrosAplicados(prepararFiltrosHistorial(iniciales));
    setErrorFiltros(null);
  }, [fechaReferencia]);

  return {
    filtrosEdicion,
    filtrosAplicados,
    errorFiltros,
    actualizarFiltro,
    aplicarFiltros,
    restablecerFiltros,
  };
}
