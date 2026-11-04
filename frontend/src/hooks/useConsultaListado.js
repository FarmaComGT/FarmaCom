import { useCallback, useEffect, useState } from 'react';

export default function useConsultaListado(cargar, parametros, mensaje) {
  const clave = JSON.stringify(parametros);
  const [estado, setEstado] = useState({ datos: [], paginacion: null, cargando: true, error: null, clave: null });
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setEstado((actual) => ({ ...actual, paginacion: null, cargando: true, error: null }));
    cargar(JSON.parse(clave), { signal: controller.signal })
      .then((resultado) => {
        if (controller.signal.aborted) return;
        setEstado({ datos: Array.isArray(resultado) ? resultado : resultado.datos,
          paginacion: resultado.paginacion ?? null, cargando: false, error: null, clave });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setEstado({ datos: [], paginacion: null, cargando: false, clave,
          error: error?.response?.data?.mensaje || error?.response?.data?.errores?.[0]?.msg || error?.message || mensaje });
      });
    return () => controller.abort();
  }, [cargar, clave, mensaje, version]);

  return { datos: estado.datos, error: estado.clave === clave ? estado.error : null,
    paginacion: estado.clave === clave ? estado.paginacion : null,
    cargando: estado.cargando || estado.clave !== clave, recargar };
}
