import React from 'react';

const ESTILOS = {
  error: 'bg-error-container/40 border-error/20 text-on-error-container',
  success: 'bg-green-50 border-green-200 text-green-800',
};

export default function PacienteAlert({ mensaje, variante = 'error' }) {
  if (!mensaje) {
    return null;
  }

  return (
    <div className={`border rounded-xl px-4 py-3 text-sm font-medium ${ESTILOS[variante] || ESTILOS.error}`}>
      {mensaje}
    </div>
  );
}
