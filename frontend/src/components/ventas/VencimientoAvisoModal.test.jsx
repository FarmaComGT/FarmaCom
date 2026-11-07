import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import VencimientoAvisoModal from './VencimientoAvisoModal';

it('identifica el aviso como diálogo y permite cerrarlo con Escape', async () => {
  const cerrar = vi.fn();
  render(<VencimientoAvisoModal isOpen productos={[]} titulo="Producto próximo a vencer" mensaje="Revisa la fecha." onClose={cerrar} onConfirm={() => {}} />);
  expect(screen.getByRole('dialog', { name: 'Producto próximo a vencer' })).toHaveAccessibleDescription('Revisa la fecha.');
  await userEvent.setup().keyboard('{Escape}');
  expect(cerrar).toHaveBeenCalledOnce();
});

it('impide cerrar y confirmar de nuevo mientras procesa', async () => {
  const cerrar = vi.fn();
  render(<VencimientoAvisoModal isOpen procesando productos={[]} titulo="Revisar vencimiento" mensaje="Revisa la fecha." onClose={cerrar} onConfirm={() => {}} />);
  await userEvent.setup().keyboard('{Escape}');
  expect(cerrar).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Sí, continuar' })).toBeDisabled();
});
