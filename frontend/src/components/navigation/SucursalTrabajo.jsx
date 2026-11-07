import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function SucursalTrabajo({ idSucursal }) {
  const [sucursal, setSucursal] = useState(null);
  useEffect(() => {
    if (!idSucursal) return undefined;
    const controller = new AbortController();
    api.get(`/sucursales/${idSucursal}`, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setSucursal({ id: String(idSucursal), nombre: data.nombre_sucursal?.trim() });
      })
      .catch(() => {}); // El identificador sigue disponible si no se pudo resolver el nombre.
    return () => controller.abort();
  }, [idSucursal]);
  const nombre = idSucursal
    ? (sucursal?.id === String(idSucursal) && sucursal.nombre) || `Sucursal ${idSucursal}`
    : 'Sin sucursal de trabajo';
  return <p className="shell-workspace" aria-label={`Sucursal de trabajo: ${nombre}`} title={`Sucursal de trabajo: ${nombre}`}>
    <span>Trabajo: </span>{nombre}
  </p>;
}
