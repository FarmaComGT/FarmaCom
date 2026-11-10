import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import UsuarioContrasenaModal from './UsuarioContrasenaModal.jsx';

const usuario = { nombre_usuario: 'Ana López', correo_usuario: 'ana@farmacom.com' };
const montar = (props = {}) => {
  const callbacks = { onClose: vi.fn(), onSubmit: vi.fn().mockResolvedValue({}), onSuccess: vi.fn(), ...props };
  render(<UsuarioContrasenaModal usuario={usuario} {...callbacks} />);
  return callbacks;
};
const completar = async (user) => {
  await user.type(screen.getByLabelText('Nueva contraseña'), 'nueva123');
  await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva123');
  await user.type(screen.getByLabelText('Tu contraseña de dueño'), 'dueno123');
};

describe('restablecimiento de contraseña', () => {
  it('valida campos vacíos y enfoca el primer error', async () => {
    const user = userEvent.setup();
    const { onSubmit } = montar();
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
    expect(screen.getByLabelText('Nueva contraseña')).toHaveFocus();
    expect(screen.getByText('Usa al menos 6 caracteres.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it('permite revelar la nueva clave y envía solo los datos necesarios', async () => {
    const user = userEvent.setup();
    const { onSubmit, onSuccess } = montar();
    await completar(user);
    await user.click(screen.getByRole('button', { name: 'Mostrar: Nueva contraseña' }));
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
    expect(onSubmit).toHaveBeenCalledWith({ contrasena_nueva: 'nueva123', contrasena_dueno: 'dueno123' });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute('type', 'password');
  });
  it('mantiene el modal abierto cuando falla la confirmación del dueño', async () => {
    const user = userEvent.setup();
    const { onSuccess } = montar({ onSubmit: vi.fn().mockRejectedValue(new Error('Tu contraseña de dueño es incorrecta.')) });
    await completar(user);
    await user.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
    expect(await screen.findByText('Tu contraseña de dueño es incorrecta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Tu contraseña de dueño')).toHaveFocus();
    expect(onSuccess).not.toHaveBeenCalled();
  });
  it('advierte que se cerrará la sesión propia', () => {
    montar({ esPropia: true });
    expect(screen.getByText(/Se cerrará tu sesión/)).toBeInTheDocument();
  });
});
