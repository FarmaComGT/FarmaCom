import React from 'react';

export default function SucursalTableHeader() {
  return (
    <tr>
      <th scope="col" style={{ width: '24%' }}>Sucursal</th>
      <th scope="col" style={{ width: '18%' }}>Ciudad</th>
      <th scope="col" style={{ width: '31%' }}>Dirección</th>
      <th scope="col" style={{ width: '27%', textAlign: 'right' }}>Acciones</th>
    </tr>
  );
}
