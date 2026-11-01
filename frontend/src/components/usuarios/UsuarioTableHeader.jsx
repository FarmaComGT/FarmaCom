import React from 'react';

export default function UsuarioTableHeader() {
  return (
    <tr>
      <th scope="col" style={{ width: '18%' }}>Nombre</th>
      <th scope="col" style={{ width: '23%' }}>Correo</th>
      <th scope="col" style={{ width: '14%' }}>Rol</th>
      <th scope="col" style={{ width: '16%' }}>Sucursal</th>
      <th scope="col" style={{ width: '10%' }}>Estado</th>
      <th scope="col" style={{ width: '19%', textAlign: 'right' }}>Acciones</th>
    </tr>
  );
}
