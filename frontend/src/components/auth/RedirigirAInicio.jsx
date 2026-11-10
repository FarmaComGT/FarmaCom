import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRouteForRole } from '../../utils/navigation';

// "Inicio" ya no existe: quien llegue a /dashboard (enlaces o favoritos antiguos) va a la
// pantalla de aterrizaje de su rol.
export default function RedirigirAInicio() {
  const { usuario } = useAuth();
  return <Navigate to={getDefaultRouteForRole(usuario?.rol)} replace />;
}
