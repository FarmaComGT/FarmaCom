import React, { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MenuFlotante from './MenuFlotante.jsx';

function Envoltorio({ abierto, onCerrar }) {
  const ancla = useRef(null);
  return (
    <div>
      <button ref={ancla} type="button">Abrir</button>
      <MenuFlotante anclaRef={ancla} abierto={abierto} onCerrar={onCerrar} id="menu-prueba">
        <button type="button">Opción</button>
      </MenuFlotante>
      <button type="button">Fuera del menú</button>
    </div>
  );
}

describe('MenuFlotante', () => {
  it('no renderiza nada mientras está cerrado', () => {
    render(<Envoltorio abierto={false} onCerrar={vi.fn()} />);
    expect(screen.queryByText('Opción')).not.toBeInTheDocument();
  });

  it('se renderiza sobre document.body cuando está abierto', () => {
    render(<Envoltorio abierto onCerrar={vi.fn()} />);
    const opcion = screen.getByText('Opción');
    expect(opcion).toBeInTheDocument();
    expect(opcion.closest('#menu-prueba')?.parentElement).toBe(document.body);
  });

  it('se cierra al hacer clic fuera', async () => {
    const user = userEvent.setup();
    const onCerrar = vi.fn();
    render(<Envoltorio abierto onCerrar={onCerrar} />);
    await user.click(screen.getByRole('button', { name: 'Fuera del menú' }));
    expect(onCerrar).toHaveBeenCalledOnce();
  });

  it('no se cierra al hacer clic dentro del menú', async () => {
    const user = userEvent.setup();
    const onCerrar = vi.fn();
    render(<Envoltorio abierto onCerrar={onCerrar} />);
    await user.click(screen.getByRole('button', { name: 'Opción' }));
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('se cierra con Escape y devuelve el foco al ancla', async () => {
    const user = userEvent.setup();
    const onCerrar = vi.fn();
    render(<Envoltorio abierto onCerrar={onCerrar} />);
    await user.keyboard('{Escape}');
    expect(onCerrar).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus();
  });
});
