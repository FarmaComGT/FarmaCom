import { useCallback, useEffect, useRef, useState } from 'react';
import { actualizarCaja, crearCaja, obtenerCajas } from '../api/cajas';

const mensajeError = (error, predeterminado) => (
  error?.response?.data?.mensaje || error?.message || predeterminado
);

export default function useAdministracionCajas(filtros) {
  const paginado = filtros?.pagina !== undefined;
  const clave = JSON.stringify(filtros ?? null);
  const solicitud = useRef(0);
  const [estado, setEstado] = useState({ datos: [], paginacion: null, cargando: true, error: null, clave: null });

  const cargar = useCallback(async () => {
    const numero = ++solicitud.current;
    setEstado((actual) => ({ ...actual, cargando: true, paginacion: null, error: null }));
    try {
      const resultado = await obtenerCajas(filtros ?? {});
      if (numero !== solicitud.current) return;
      setEstado({ datos: Array.isArray(resultado) ? resultado : resultado.datos,
        paginacion: resultado.paginacion ?? null, cargando: false, error: null, clave });
    } catch (errorSolicitud) {
      if (numero !== solicitud.current) return;
      setEstado({ datos: [], paginacion: null, cargando: false, clave,
        error: mensajeError(errorSolicitud, 'No se pudieron cargar las cajas.') });
    }
  }, [clave]);

  useEffect(() => {
    solicitud.current += 1;
    const temporizador = setTimeout(cargar, paginado && filtros?.busqueda ? 300 : 0);
    return () => { clearTimeout(temporizador); solicitud.current += 1; };
  }, [cargar, paginado, filtros?.busqueda]);

  const crear = async (datos) => {
    const nueva = await crearCaja(datos).catch((errorSolicitud) => {
      throw new Error(mensajeError(errorSolicitud, 'No se pudo crear la caja.'));
    });
    await cargar();
    return nueva;
  };

  const actualizar = async (idCaja, datos) => {
    const actualizada = await actualizarCaja(idCaja, datos).catch((errorSolicitud) => {
      throw new Error(mensajeError(errorSolicitud, 'No se pudo actualizar la caja.'));
    });
    if (paginado) await cargar();
    else setEstado((actual) => ({ ...actual, datos: actual.datos.map((caja) => (
      caja.id_caja === idCaja ? { ...caja, ...actualizada } : caja
    )) }));
    return actualizada;
  };

  return { cajas: estado.datos,
    paginacion: estado.clave === clave ? estado.paginacion : null,
    cargando: estado.cargando || estado.clave !== clave,
    error: estado.clave === clave ? estado.error : null,
    crear, actualizar, recargar: cargar };
}
