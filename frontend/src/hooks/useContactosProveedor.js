import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export default function useContactosProveedor(idProveedor) {
  const [telefonos, setTelefonos] = useState([]);
  const [correos, setCorreos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!idProveedor) {
      setTelefonos([]);
      setCorreos([]);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const [resTelefonos, resCorreos] = await Promise.all([
        api.get(`/proveedores/${idProveedor}/telefonos`),
        api.get(`/proveedores/${idProveedor}/correos`),
      ]);

      setTelefonos(resTelefonos.data || []);
      setCorreos(resCorreos.data || []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar contactos del proveedor');
    } finally {
      setCargando(false);
    }
  }, [idProveedor]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregarTelefono = async (numero) => {
    const { data } = await api.post(`/proveedores/${idProveedor}/telefonos`, { numero });
    setTelefonos((prev) => [...prev, data]);
  };

  const actualizarTelefono = async (idTelefono, numero) => {
    const { data } = await api.put(`/proveedores/${idProveedor}/telefonos/${idTelefono}`, { numero });
    setTelefonos((prev) => prev.map((telefono) => (
      telefono.id_telefono === idTelefono ? data : telefono
    )));
  };

  const eliminarTelefono = async (idTelefono) => {
    await api.delete(`/proveedores/${idProveedor}/telefonos/${idTelefono}`);
    setTelefonos((prev) => prev.filter((telefono) => telefono.id_telefono !== idTelefono));
  };

  const agregarCorreo = async (correo) => {
    const { data } = await api.post(`/proveedores/${idProveedor}/correos`, { correo });
    setCorreos((prev) => [...prev, data]);
  };

  const actualizarCorreo = async (idCorreo, correo) => {
    const { data } = await api.put(`/proveedores/${idProveedor}/correos/${idCorreo}`, { correo });
    setCorreos((prev) => prev.map((item) => (item.id_email === idCorreo ? data : item)));
  };

  const eliminarCorreo = async (idCorreo) => {
    await api.delete(`/proveedores/${idProveedor}/correos/${idCorreo}`);
    setCorreos((prev) => prev.filter((item) => item.id_email !== idCorreo));
  };

  return {
    telefonos,
    correos,
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
