import React from 'react';

export default function PacienteTableHeader() {
  return (
    <thead>
      <tr>
        <th scope="col" style={{ width: '20%' }}>Paciente</th>
        <th scope="col" style={{ width: '15%' }}>DPI</th>
        <th scope="col" style={{ width: '8%' }}>Edad</th>
        <th scope="col" style={{ width: '8%' }}>Sexo</th>
        <th scope="col" style={{ width: '14%' }}>Teléfono</th>
        <th scope="col" style={{ width: '14%' }}>Registro</th>
        <th scope="col" style={{ width: '11%' }}>Estado</th>
        <th scope="col" style={{ width: '10%', textAlign: 'right' }}>Acciones</th>
      </tr>
    </thead>
  );
}
