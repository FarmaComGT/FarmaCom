import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccessibleDialog from './AccessibleDialog.jsx';
import styles from './AccessibleDialog.module.css';

vi.mock('./AccessibleDialog.module.css', () => ({
  default: {
    backdrop: 'backdrop',
    dialog: 'dialog',
    small: 'small',
    medium: 'medium',
    large: 'large',
  },
}));

describe('AccessibleDialog', () => {
  let appRoot;

  beforeEach(() => {
    appRoot = document.createElement('div');
    appRoot.id = 'root';
    document.body.appendChild(appRoot);
    document.body.style.overflow = '';
  });

  afterEach(() => {
    appRoot.remove();
    document.body.style.overflow = '';
  });

  it('no renderiza contenido mientras está cerrado', () => {
    render(
      <AccessibleDialog open={false} labelledBy="titulo" onClose={vi.fn()}>
        <h2 id="titulo">Título</h2>
      </AccessibleDialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('configura el diálogo, enfoca el campo inválido y restaura el entorno', () => {
    const disparador = document.createElement('button');
    disparador.textContent = 'Abrir';
    document.body.appendChild(disparador);
    disparador.focus();

    const { rerender } = render(
      <AccessibleDialog
        open
        labelledBy="titulo-dialogo"
        describedBy="descripcion-dialogo"
        onClose={vi.fn()}
        size="large"
      >
        <h2 id="titulo-dialogo">Editar registro</h2>
        <p id="descripcion-dialogo">Completa los datos.</p>
        <input aria-label="Nombre" />
        <input aria-label="Correo" aria-invalid="true" />
      </AccessibleDialog>,
    );

    const dialogo = screen.getByRole('dialog', { name: 'Editar registro' });
    expect(dialogo).toHaveAttribute('aria-describedby', 'descripcion-dialogo');
    expect(dialogo).toHaveAttribute('aria-busy', 'false');
    expect(dialogo).toHaveClass(styles.large);
    expect(screen.getByLabelText('Correo')).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    expect(appRoot.inert).toBe(true);

    rerender(
      <AccessibleDialog open={false} labelledBy="titulo-dialogo" onClose={vi.fn()}>
        <h2 id="titulo-dialogo">Editar registro</h2>
      </AccessibleDialog>,
    );

    expect(document.body.style.overflow).toBe('');
    expect(disparador).toHaveFocus();
    expect(appRoot.inert).toBeUndefined();
    disparador.remove();
  });

  it('usa el primer control disponible y conserva el foco dentro del diálogo', () => {
    render(
      <AccessibleDialog open labelledBy="titulo" onClose={vi.fn()}>
        <h2 id="titulo">Confirmar acción</h2>
        <button type="button">Cancelar</button>
        <button type="button">Confirmar</button>
      </AccessibleDialog>,
    );

    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    const confirmar = screen.getByRole('button', { name: 'Confirmar' });
    const dialogo = screen.getByRole('dialog');
    expect(cancelar).toHaveFocus();

    confirmar.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(cancelar).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(confirmar).toHaveFocus();

    dialogo.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(confirmar).toHaveFocus();

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(confirmar).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(confirmar).toHaveFocus();
  });

  it('enfoca el panel cuando no hay controles y aplica el tamaño predeterminado', () => {
    render(
      <AccessibleDialog open labelledBy="titulo" onClose={vi.fn()} size="desconocido">
        <h2 id="titulo">Mensaje informativo</h2>
        <p>Sin acciones disponibles.</p>
      </AccessibleDialog>,
    );

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveFocus();
    expect(dialogo).toHaveClass(styles.medium);

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(dialogo).toHaveFocus();
  });

  it('cierra con Escape salvo que exista una operación en curso', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <AccessibleDialog open labelledBy="titulo" onClose={onClose}>
        <h2 id="titulo">Eliminar registro</h2>
        <button type="button">Cancelar</button>
      </AccessibleDialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <AccessibleDialog open labelledBy="titulo" onClose={onClose} busy>
        <h2 id="titulo">Eliminar registro</h2>
        <button type="button">Cancelar</button>
      </AccessibleDialog>,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('tolera Escape cuando no se proporciona callback de cierre', () => {
    render(
      <AccessibleDialog open labelledBy="titulo">
        <h2 id="titulo">Aviso</h2>
      </AccessibleDialog>,
    );

    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
  });
});
