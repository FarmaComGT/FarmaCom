import React from 'react';

export default function UsuarioTableHeader() {
  return (
    <tr>
      <th scope="col" style={{ width: '18%' }}>Nombre</th>
      <th scope="col" style={{ width: '20%' }}>Correo</th>
      <th scope="col" style={{ width: '14%' }}>Rol</th>
      <th scope="col" style={{ width: '12%' }}>Sucursal</th>
      <th scope="col" style={{ width: '12%' }}>Estado</th>
      <th scope="col" style={{ width: '24%', textAlign: 'right' }}>Acciones</th>
    </tr>
  );
}
