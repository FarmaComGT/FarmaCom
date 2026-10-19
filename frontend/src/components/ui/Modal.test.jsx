import React from 'react';
import { render, screen } from '@testing-library/react';
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
    render(
      <Modal isOpen labelledBy="titulo-modal">
        <ModalHeader title="Nuevo producto" titleId="titulo-modal" onClose={() => {}} />
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
      <Modal isOpen labelledBy="titulo-modal">
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
});
