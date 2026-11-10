import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuAcciones from './MenuAcciones.jsx';

const ETIQUETA = 'Más acciones para Caja 1';

function acciones(sobrescribir = {}) {
  return [
    { clave: 'editar', etiqueta: 'Editar', onClick: vi.fn() },
    { clave: 'estado', etiqueta: 'Desactivar', peligro: true, onClick: vi.fn() },
    { clave: 'eliminar', etiqueta: 'Eliminar', peligro: true, separadorAntes: true, onClick: vi.fn() },
  ].map((accion) => ({ ...accion, ...sobrescribir[accion.clave] }));
}

describe('MenuAcciones', () => {
  it('muestra solo el botón de tres puntos hasta abrirlo y se adapta al número de acciones', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MenuAcciones etiqueta={ETIQUETA} acciones={acciones()} />);

    const boton = screen.getByRole('button', { name: ETIQUETA });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();

    await user.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('group', { name: ETIQUETA })[0].querySelectorAll('button')).toHaveLength(3);

    rerender(<MenuAcciones etiqueta={ETIQUETA} acciones={acciones().slice(0, 1)} />);
    expect(screen.getAllByRole('group', { name: ETIQUETA })[0].querySelectorAll('button')).toHaveLength(1);
  });

  it('omite las acciones ocultas y no renderiza nada si no queda ninguna', () => {
    const { container, rerender } = render(
      <MenuAcciones etiqueta={ETIQUETA} acciones={acciones({ editar: { oculta: true } })} />,
    );
    expect(screen.getByRole('button', { name: ETIQUETA })).toBeInTheDocument();

    rerender(<MenuAcciones etiqueta={ETIQUETA} acciones={acciones().map((accion) => ({ ...accion, oculta: true }))} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ejecuta la acción elegida, cierra el menú y devuelve el foco al botón', async () => {
    const user = userEvent.setup();
    const lista = acciones();
    render(<MenuAcciones etiqueta={ETIQUETA} acciones={lista} />);

    await user.click(screen.getByRole('button', { name: ETIQUETA }));
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(lista[1].onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: ETIQUETA })).toHaveFocus();
  });

  it('no ejecuta acciones deshabilitadas', async () => {
    const user = userEvent.setup();
    const lista = acciones({ eliminar: { deshabilitada: true } });
    render(<MenuAcciones etiqueta={ETIQUETA} acciones={lista} />);

    await user.click(screen.getByRole('button', { name: ETIQUETA }));
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
    expect(lista[2].onClick).not.toHaveBeenCalled();
  });

  it('enfoca la primera opción al abrir y se recorre con las flechas, Inicio y Fin', async () => {
    const user = userEvent.setup();
    render(<MenuAcciones etiqueta={ETIQUETA} acciones={acciones({ estado: { deshabilitada: true } })} />);

    await user.click(screen.getByRole('button', { name: ETIQUETA }));
    expect(screen.getByRole('button', { name: 'Editar' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveFocus(); // salta la deshabilitada
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Editar' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'Editar' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveFocus();
  });

  it('se cierra con Escape y con Tab devolviendo el foco al botón', async () => {
    const user = userEvent.setup();
    render(<MenuAcciones etiqueta={ETIQUETA} acciones={acciones()} />);
    const boton = screen.getByRole('button', { name: ETIQUETA });

    await user.click(boton);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(boton).toHaveFocus();

    await user.click(boton);
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('muestra un spinner y bloquea el botón mientras la fila está ocupada', () => {
    render(<MenuAcciones etiqueta={ETIQUETA} acciones={acciones()} ocupado />);

    const boton = screen.getByRole('button', { name: ETIQUETA });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('aria-busy', 'true');
  });
});
