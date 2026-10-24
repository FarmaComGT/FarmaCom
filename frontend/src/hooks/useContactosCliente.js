import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export default function useContactosCliente(idCliente) {
  const [telefonos, setTelefonos] = useState([]);
  const [correos, setCorreos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!idCliente) {
      setTelefonos([]);
      setCorreos([]);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const [resTelefonos, resCorreos] = await Promise.all([
        api.get(`/clientes/${idCliente}/telefonos`),
        api.get(`/clientes/${idCliente}/correos`),
      ]);

      setTelefonos(resTelefonos.data || []);
      setCorreos(resCorreos.data || []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar los contactos del cliente');
    } finally {
      setCargando(false);
    }
  }, [idCliente]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregarTelefono = async (numero) => {
    const { data } = await api.post(`/clientes/${idCliente}/telefonos`, { numero });
    setTelefonos((prev) => [...prev, data]);
  };

  const actualizarTelefono = async (idTelefono, numero) => {
    const { data } = await api.put(`/clientes/${idCliente}/telefonos/${idTelefono}`, { numero });
    setTelefonos((prev) => prev.map((t) => (t.id_telefono === idTelefono ? data : t)));
  };

  const eliminarTelefono = async (idTelefono) => {
    await api.delete(`/clientes/${idCliente}/telefonos/${idTelefono}`);
    setTelefonos((prev) => prev.filter((t) => t.id_telefono !== idTelefono));
  };

  const agregarCorreo = async (correo) => {
    const { data } = await api.post(`/clientes/${idCliente}/correos`, { correo });
    setCorreos((prev) => [...prev, data]);
  };

  const actualizarCorreo = async (idEmail, correo) => {
    const { data } = await api.put(`/clientes/${idCliente}/correos/${idEmail}`, { correo });
    setCorreos((prev) => prev.map((c) => (c.id_email === idEmail ? data : c)));
  };

  const eliminarCorreo = async (idEmail) => {
    await api.delete(`/clientes/${idCliente}/correos/${idEmail}`);
    setCorreos((prev) => prev.filter((c) => c.id_email !== idEmail));
  };

  return {
    telefonos,
    correos,
    cargando,
    error,
    agregarTelefono,
    actualizarTelefono,
    eliminarTelefono,
    agregarCorreo,
    actualizarCorreo,
    eliminarCorreo,
  };
}
