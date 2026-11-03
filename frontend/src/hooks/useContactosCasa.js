import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export default function useContactosCasa(idCasa) {
  const [telefonos, setTelefonos] = useState([]);
  const [correos, setCorreos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!idCasa) {
      setTelefonos([]);
      setCorreos([]);
      setProveedores([]);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const [resTelefonos, resCorreos, resProveedores] = await Promise.all([
        api.get(`/casas/${idCasa}/telefonos`),
        api.get(`/casas/${idCasa}/correos`),
        api.get(`/casas/${idCasa}/proveedores`),
      ]);

      setTelefonos(resTelefonos.data || []);
      setCorreos(resCorreos.data || []);
      setProveedores(resProveedores.data || []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar los datos de la casa farmacéutica');
    } finally {
      setCargando(false);
    }
  }, [idCasa]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregarTelefono = async (numero) => {
    const { data } = await api.post(`/casas/${idCasa}/telefonos`, { numero });
    setTelefonos((prev) => [...prev, data]);
  };

  const actualizarTelefono = async (idTelefono, numero) => {
    const { data } = await api.put(`/casas/${idCasa}/telefonos/${idTelefono}`, { numero });
    setTelefonos((prev) =>
      prev.map((t) => (t.id_telefono === idTelefono ? data : t)),
    );
  };

  const eliminarTelefono = async (idTelefono) => {
    await api.delete(`/casas/${idCasa}/telefonos/${idTelefono}`);
    setTelefonos((prev) => prev.filter((t) => t.id_telefono !== idTelefono));
  };

  const agregarCorreo = async (correo) => {
    const { data } = await api.post(`/casas/${idCasa}/correos`, { correo });
    setCorreos((prev) => [...prev, data]);
  };

  const actualizarCorreo = async (idEmail, correo) => {
    const { data } = await api.put(`/casas/${idCasa}/correos/${idEmail}`, { correo });
    setCorreos((prev) =>
      prev.map((c) => (c.id_email === idEmail ? data : c)),
    );
  };

  const eliminarCorreo = async (idEmail) => {
    await api.delete(`/casas/${idCasa}/correos/${idEmail}`);
    setCorreos((prev) => prev.filter((c) => c.id_email !== idEmail));
  };

  return {
    telefonos,
    correos,
    proveedores,
    cargando,
    error,
    refrescar: cargar,
    agregarTelefono,
    actualizarTelefono,
    eliminarTelefono,
    agregarCorreo,
    actualizarCorreo,
    eliminarCorreo,
  };
}
