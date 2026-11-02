import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal, ModalActions, ModalHeader } from './Modal.jsx';

describe('Modal', () => {
  it('no renderiza su contenido cuando está cerrado', () => {
    render(
      <Modal isOpen={false} labelledBy="titulo-modal">
        Contenido del modal
      </Modal>,
    );

    expect(screen.queryByText('Contenido del modal')).not.toBeInTheDocument();
  });

  it('renderiza un diálogo accesible dentro de un portal', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen labelledBy="titulo-modal" onClose={onClose}>
        <ModalHeader title="Nuevo producto" titleId="titulo-modal" onClose={onClose} />
        <p>Contenido del modal</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: 'Nuevo producto' })).toBeInTheDocument();
    expect(screen.getByText('Contenido del modal')).toBeInTheDocument();
  });

  it('delega el cierre y agrupa las acciones del formulario', async () => {
    const usuario = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal isOpen labelledBy="titulo-modal" onClose={onClose}>
        <ModalHeader title="Editar lote" titleId="titulo-modal" onClose={onClose} />
        <ModalActions>
          <button type="button">Guardar lote</button>
        </ModalActions>
      </Modal>,
    );

    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Guardar lote' })).toBeInTheDocument();
  });

  it('cierra con Escape, encierra el foco y lo devuelve al disparador', () => {
    const onClose = vi.fn();
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();

    const { rerender } = render(
      <Modal isOpen labelledBy="titulo-modal" onClose={onClose}>
        <ModalHeader title="Editar producto" titleId="titulo-modal" onClose={onClose} />
        <button type="button">Guardar</button>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <Modal isOpen={false} labelledBy="titulo-modal" onClose={onClose}>
        <p>Contenido</p>
      </Modal>,
    );
    expect(disparador).toHaveFocus();
    disparador.remove();
  });
});
