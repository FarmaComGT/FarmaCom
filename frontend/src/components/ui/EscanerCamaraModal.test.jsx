import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import EscanerCamaraModal from './EscanerCamaraModal';
import { iniciarEscanerCamara } from '../../utils/escanerCamara';

vi.mock('../../utils/escanerCamara', async (importOriginal) => ({ ...await importOriginal(), iniciarEscanerCamara: vi.fn() }));

describe('EscanerCamaraModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cambia de cámara liberando la anterior y detiene la última al salir', async () => {
    const detener = vi.fn();
    iniciarEscanerCamara.mockImplementation(({ onListo }) => {
      onListo([{ deviceId: 'webcam', label: 'Webcam integrada' }]);
      return detener;
    });
    const { unmount } = render(<EscanerCamaraModal onClose={vi.fn()} onCodigo={vi.fn()} />);
    await userEvent.setup().selectOptions(screen.getByLabelText('Cámara'), 'webcam');
    expect(detener).toHaveBeenCalledTimes(1);
    expect(iniciarEscanerCamara).toHaveBeenLastCalledWith(expect.objectContaining({ deviceId: 'webcam' }));
    unmount();
    expect(detener).toHaveBeenCalledTimes(2);
  });

  it('explica el permiso denegado y permite reintentar o cerrar con Escape', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
    iniciarEscanerCamara.mockImplementation(({ onError }) => {
      onError({ name: 'NotAllowedError' });
      return vi.fn();
    });
    const cerrar = vi.fn();
    render(<EscanerCamaraModal onClose={cerrar} onCodigo={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Habilita el permiso');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    await waitFor(() => expect(iniciarEscanerCamara).toHaveBeenCalledTimes(2));
    await userEvent.setup().keyboard('{Escape}');
    expect(cerrar).toHaveBeenCalled();
  });

  it('muestra zoom únicamente cuando la cámara lo permite y comunica fallos', async () => {
    const aplicar = vi.fn().mockRejectedValue(new Error('No compatible'));
    iniciarEscanerCamara.mockImplementation(({ onListo }) => {
      onListo([], { zoom: { min: 1, max: 3, step: 0.1, value: 1, aplicar } });
      return vi.fn();
    });
    render(<EscanerCamaraModal onClose={vi.fn()} onCodigo={vi.fn()} />);
    fireEvent.change(screen.getByRole('slider', { name: /Zoom de cámara/ }), { target: { value: '2' } });
    await waitFor(() => expect(aplicar).toHaveBeenCalledWith(2));
    expect(await screen.findByText(/No se pudo ajustar el zoom/)).toBeInTheDocument();
  });
});
