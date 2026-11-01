import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import CajaDialog from './CajaDialog';

function Ejemplo({ ocupada = false }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <main id="root">
      <button type="button" onClick={() => setAbierta(true)}>Nueva caja</button>
      <CajaDialog abierta={abierta} labelledBy="titulo-ejemplo" onClose={() => setAbierta(false)} ocupada={ocupada}>
        <h2 id="titulo-ejemplo">Datos de la caja</h2>
        <button type="button" onClick={() => setAbierta(false)}>Cerrar</button>
        <label htmlFor="nombre-ejemplo">Nombre</label>
        <input id="nombre-ejemplo" />
        <button type="button">Guardar</button>
      </CajaDialog>
    </main>
  );
}

describe('CajaDialog', () => {
  it('enfoca el campo y mantiene Tab dentro del diálogo', async () => {
    const user = userEvent.setup();
    render(<Ejemplo />);
    await user.click(screen.getByRole('button', { name: 'Nueva caja' }));

    expect(screen.getByLabelText('Nombre')).toHaveFocus();
    expect(document.getElementById('root').inert).toBe(true);
    screen.getByRole('button', { name: 'Guardar' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveFocus();
  });

  it('cierra con Escape y devuelve el foco al botón que lo abrió', async () => {
    const user = userEvent.setup();
    render(<Ejemplo />);
    const abrir = screen.getByRole('button', { name: 'Nueva caja' });
    await user.click(abrir);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
    expect(document.getElementById('root').inert).not.toBe(true);
    expect(document.body.style.overflow).toBe('');
  });

  it('mantiene abierto el diálogo cuando hay una solicitud en curso', async () => {
    const user = userEvent.setup();
    render(<Ejemplo ocupada />);
    await user.click(screen.getByRole('button', { name: 'Nueva caja' }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
  });
});
