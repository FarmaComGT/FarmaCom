import React from 'react';

export default function ProveedorTableHeader() {
  return (
    <tr>
      <th scope="col" style={{ width: '10%' }}>Código</th>
      <th scope="col">Nombre</th>
      <th scope="col" style={{ width: '14%' }}>Estado</th>
      <th scope="col" style={{ width: '12%', textAlign: 'right' }}>Acciones</th>
    </tr>
  );
}
