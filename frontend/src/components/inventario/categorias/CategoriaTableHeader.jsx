import React from 'react';

export default function CategoriaTableHeader() {
  return (
    <tr>
      <th scope="col" style={{ width: '14%' }}>Código</th>
      <th scope="col">Nombre</th>
      <th scope="col" style={{ width: '32%', textAlign: 'right' }}>Acciones</th>
    </tr>
  );
}
