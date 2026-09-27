import { useState, useEffect, useCallback } from 'react';
import { obtenerCategoriasSugeridas } from '../api/resultadosLaboratorio';

const useCategoriasSugeridas = (idLaboratorio) => {
  const [categorias, setCategorias] = useState([]);

  const obtener = useCallback(async () => {
    if (!idLaboratorio) return;
    try {
      const data = await obtenerCategoriasSugeridas(idLaboratorio);
      setCategorias(data);
    } catch {
      // Es solo una ayuda de autocompletado; si falla, se deja vacío.
    }
  }, [idLaboratorio]);

  useEffect(() => {
    obtener();
  }, [obtener]);

  return categorias;
};

export default useCategoriasSugeridas;
