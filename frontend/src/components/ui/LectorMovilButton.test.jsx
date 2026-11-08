import React from 'react';
import { act, render as renderBase, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LectorMovilButton from './LectorMovilButton';
import { LectorMovilProvider } from '../../context/LectorMovilContext';
function render(ui) {
  const resultado = renderBase(<LectorMovilProvider>{ui}</LectorMovilProvider>);
  return { ...resultado, rerender: (nuevo) => resultado.rerender(<LectorMovilProvider>{nuevo}</LectorMovilProvider>) };
}
import { acusarLectura, crearVinculacion, pulsoVinculacion, confirmarVinculacion, revocarVinculacion } from '../../api/lectorMovil';

vi.mock('../../api/lectorMovil', () => ({ crearVinculacion: vi.fn(), pulsoVinculacion: vi.fn(), confirmarVinculacion: vi.fn(), revocarVinculacion: vi.fn(), acusarLectura: vi.fn() }));
const sesion = { id: 'sesion-1', enlace: 'https://farmacom.example/lector-movil#clave=prueba', qr: 'data:image/png;base64,prueba', vence: Date.now() + 120000, limiteJornada: Date.now() + 8 * 3600000, inactividadMinutos: 15, conectado: false, confirmado: false, verificacion: '123456' };

describe('LectorMovilButton', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    crearVinculacion.mockResolvedValue(sesion);
    pulsoVinculacion.mockResolvedValue({ ...sesion, conectado: true });
    confirmarVinculacion.mockResolvedValue({ ...sesion, conectado: true, confirmado: true });
    revocarVinculacion.mockResolvedValue();
    acusarLectura.mockResolvedValue();
  });

  it('exige confirmar el código y conserva la conexión al cambiar de carrito', async () => {
    const usuario = userEvent.setup();
    const { rerender } = render(<LectorMovilButton destino="ventas" contexto="carrito-1" onCodigo={vi.fn()} />);
    await usuario.click(screen.getByRole('button', { name: 'Usar celular como lector' }));
    expect(await screen.findByText('123456')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Confirmar teléfono' }));
    expect(await screen.findByRole('button', { name: 'Administrar celular conectado' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<LectorMovilButton destino="ventas" contexto="carrito-2" onCodigo={vi.fn()} />);
    expect(revocarVinculacion).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Administrar celular conectado' })).toBeInTheDocument();
  });

  it('cancela y revoca una creación que termina después de cerrar el diálogo', async () => {
    let resolver;
    crearVinculacion.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
    const usuario = userEvent.setup();
    render(<LectorMovilButton destino="producto" contexto="producto-1" onCodigo={vi.fn()} />);
    await usuario.click(screen.getByRole('button', { name: 'Usar celular como lector' }));
    await usuario.click(screen.getByRole('button', { name: 'Cerrar vinculación' }));
    await act(async () => resolver(sesion));
    expect(revocarVinculacion).toHaveBeenCalledWith('sesion-1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('explica al usuario que el encargado debe habilitar la conexión', async () => {
    crearVinculacion.mockRejectedValue({ response: { status: 426, data: { mensaje: 'El lector remoto requiere HTTPS.' } } });
    render(<LectorMovilButton destino="ventas" contexto="1" onCodigo={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar celular como lector' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pide al encargado');
    expect(screen.queryByText(/HTTPS/)).not.toBeInTheDocument();
    expect(revocarVinculacion).not.toHaveBeenCalled();
  });

  it('reintenta el acuse sin procesar dos veces la misma lectura', async () => {
    const onCodigo = vi.fn().mockResolvedValue();
    pulsoVinculacion.mockResolvedValue({ ...sesion, conectado: true, confirmado: true, lectura: { id: 'lectura-1', codigo: '000123' } });
    acusarLectura.mockRejectedValueOnce(new Error('Conexión interrumpida')).mockResolvedValue({});
    render(<LectorMovilButton destino="ventas" contexto="1" onCodigo={onCodigo} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar celular como lector' }));
    await waitFor(() => expect(acusarLectura).toHaveBeenCalledTimes(2), { timeout: 2500 });
    expect(onCodigo).toHaveBeenCalledExactlyOnceWith('000123');
  });

  it('mantiene el enlace de ayuda oculto y conserva la navegación por teclado', async () => {
    pulsoVinculacion.mockResolvedValue(sesion);
    const usuario = userEvent.setup();
    render(<LectorMovilButton destino="ventas" contexto="1" onCodigo={vi.fn()} />);
    await usuario.click(screen.getByRole('button', { name: 'Usar celular como lector' }));
    expect(await screen.findByRole('img', { name: 'QR de vinculación temporal del lector' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar vinculación' })).toHaveFocus();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'No puedo abrir el QR' })).toHaveFocus();
    await usuario.keyboard('{Enter}');
    expect(screen.getByRole('textbox', { name: 'Enlace para abrir manualmente' })).toHaveValue(sesion.enlace);
  });
});
