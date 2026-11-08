// @vitest-environment-options {"url":"https://farmacom.example/lector-movil"}
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LectorMovil from './LectorMovil';
import { solicitudMovil } from '../api/lectorMovil';

vi.mock('../api/lectorMovil', () => ({ solicitudMovil: vi.fn() }));
vi.mock('../components/ui/EscanerCamaraModal', () => ({ default: ({ onClose }) => <button type="button" onClick={onClose}>Cancelar cámara de prueba</button> }));

describe('recepción del acuse en el teléfono', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('isSecureContext', true);
    window.history.replaceState(null, '', `/lector-movil#id=12345678-1234-1234-1234-123456789abc&clave=${'a'.repeat(64)}`);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(['respuesta tardía', 'error tardío'])('conserva el acuse si el envío termina después: %s', async (caso) => {
    let lecturaId;
    let resolver;
    let rechazar;
    solicitudMovil.mockImplementation((_id, _token, accion, opciones) => {
      if (accion === 'conectar') return Promise.resolve({ token: 'b'.repeat(64), contexto: 'contexto-ventas', destino: 'ventas', confirmado: true, disponible: true });
      if (accion === 'estado') return Promise.resolve({ contexto: 'contexto-ventas', destino: 'ventas', confirmado: true, disponible: true, ultimoAcuse: lecturaId });
      if (accion === 'lecturas') {
        lecturaId = opciones.body.id;
        return new Promise((resolve, reject) => { resolver = resolve; rechazar = reject; });
      }
      return Promise.resolve();
    });
    const usuario = userEvent.setup();
    render(<LectorMovil />);
    await usuario.click(screen.getByRole('button', { name: 'Usar cámara' }));
    expect(window.location.hash).toBe('');
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar cámara de prueba' }));
    await usuario.click(screen.getByText('Escribir código'));
    await usuario.type(await screen.findByRole('textbox', { name: 'Código del producto' }), '000123');
    await usuario.click(screen.getByRole('button', { name: 'Enviar código' }));
    await waitFor(() => expect(screen.getByText('Lectura recibida por la computadora.')).toBeInTheDocument(), { timeout: 2500 });
    await act(async () => { if (caso === 'error tardío') rechazar(new Error('Conexión interrumpida')); else resolver({ recibido: true }); });
    expect(screen.getByText('Lectura recibida por la computadora.')).toBeInTheDocument();
    expect(screen.queryByText(/Esperando que la computadora/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Código del producto' })).toHaveValue('');
  });

  it('abre la cámara una sola vez después de confirmar el teléfono en la computadora', async () => {
    let confirmado = false;
    solicitudMovil.mockImplementation((_id, _token, accion) => Promise.resolve(accion === 'conectar'
      ? { token: 'b'.repeat(64), contexto: 'contexto-ventas', destino: 'ventas', confirmado: false, disponible: false, verificacion: '123456' }
      : { contexto: 'contexto-ventas', destino: 'ventas', confirmado, disponible: confirmado, verificacion: '123456' }));
    const usuario = userEvent.setup();
    render(<LectorMovil />);
    await usuario.click(screen.getByRole('button', { name: 'Usar cámara' }));
    expect(await screen.findByText('123456')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar cámara de prueba' })).not.toBeInTheDocument();
    confirmado = true;
    const cancelar = await screen.findByRole('button', { name: 'Cancelar cámara de prueba' }, { timeout: 2500 });
    await usuario.click(cancelar);
    await waitFor(() => expect(solicitudMovil.mock.calls.filter(([, , accion]) => accion === 'estado').length).toBeGreaterThanOrEqual(3), { timeout: 2500 });
    expect(screen.queryByRole('button', { name: 'Cancelar cámara de prueba' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escanear código' })).toBeEnabled();
  });

  it('al revocarse muestra cómo reconectar y no ofrece reutilizar el enlace consumido', async () => {
    solicitudMovil.mockImplementation((_id, _token, accion) => accion === 'conectar'
      ? Promise.resolve({ token: 'b'.repeat(64), contexto: 'contexto-ventas', destino: 'ventas', confirmado: false })
      : Promise.reject(Object.assign(new Error('La vinculación terminó.'), { status: 410 })));
    render(<LectorMovil />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar cámara' }));
    expect(await screen.findByText(/abre el nuevo QR/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar cámara' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar cámara de prueba' })).not.toBeInTheDocument();
  });

  it('cierra la cámara al cambiar de destino y no aplica una respuesta de envío anterior', async () => {
    let estadoServidor = { contexto: 'ventas', destino: 'ventas', confirmado: true, disponible: true };
    let resolver;
    solicitudMovil.mockImplementation((_id, _token, accion) => {
      if (accion === 'conectar') return Promise.resolve({ ...estadoServidor, token: 'b'.repeat(64) });
      if (accion === 'estado') return Promise.resolve(estadoServidor);
      if (accion === 'lecturas') return new Promise((resolve) => { resolver = resolve; });
      return Promise.resolve();
    });
    const usuario = userEvent.setup();
    render(<LectorMovil />);
    await usuario.click(screen.getByRole('button', { name: 'Usar cámara' }));
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar cámara de prueba' }));
    await usuario.click(screen.getByText('Escribir código'));
    await usuario.type(screen.getByRole('textbox', { name: 'Código del producto' }), '000123');
    await usuario.click(screen.getByRole('button', { name: 'Enviar código' }));
    estadoServidor = { contexto: 'producto', destino: 'producto', confirmado: true, disponible: true };
    await screen.findByText('Destino: Registro de producto', {}, { timeout: 2500 });
    await act(async () => resolver({ recibido: true }));
    expect(screen.queryByText(/Esperando que la computadora/)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Código del producto' })).toHaveValue('');
    await usuario.click(screen.getByRole('button', { name: 'Escanear código' }));
    expect(screen.getByRole('button', { name: 'Cancelar cámara de prueba' })).toBeInTheDocument();
    estadoServidor = { contexto: 'pausa', destino: 'pausa', confirmado: true, disponible: false };
    await screen.findByText('Destino: En pausa', {}, { timeout: 2500 });
    expect(screen.queryByRole('button', { name: 'Cancelar cámara de prueba' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escanear código' })).toBeDisabled();
  });
});
