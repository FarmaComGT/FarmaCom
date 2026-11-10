import { screen } from '@testing-library/react';

// Las acciones de cada fila viven dentro del menú de tres puntos: hay que abrirlo antes.
export async function abrirAcciones(user, nombreFila) {
  await user.click(screen.getByRole('button', { name: `Más acciones para ${nombreFila}` }));
}

export async function elegirAccion(user, nombreFila, accion) {
  await abrirAcciones(user, nombreFila);
  await user.click(screen.getByRole('button', { name: accion }));
}
