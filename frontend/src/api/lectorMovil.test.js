// @vitest-environment-options {"url":"https://farmacom.example/lector-movil"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { solicitudMovil } from './lectorMovil';

describe('transporte del lector móvil', () => {
  beforeEach(() => vi.stubEnv('VITE_LECTOR_TUNEL_PRIVADO', 'false'));
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('envía la credencial por cabecera y excluye cookies, caché y referente', async () => {
    vi.stubEnv('VITE_API_URL', 'https://farmacom.example/api');
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ recibido: true }) });
    vi.stubGlobal('fetch', fetch);
    await solicitudMovil('sesion', 'credencial-secreta', 'lecturas', { method: 'POST', body: { id: 'lectura', codigo: '000123' } });
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe('https://farmacom.example/api/lector-movil/movil/sesion/lecturas');
    expect(url).not.toContain('credencial-secreta');
    expect(opciones).toMatchObject({ credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', headers: { Authorization: 'Bearer credencial-secreta' } });
    expect(JSON.parse(opciones.body).codigo).toBe('000123');
  });

  it('rechaza un API HTTP antes de transmitir la credencial', async () => {
    vi.stubEnv('VITE_API_URL', 'http://farmacom.example/api');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(solicitudMovil('sesion', 'secreto', 'estado')).rejects.toThrow('HTTPS');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('conserva el estado HTTP para cerrar credenciales revocadas', async () => {
    vi.stubEnv('VITE_API_URL', 'https://farmacom.example/api');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 410, json: async () => ({ mensaje: 'Vinculación terminada.' }) }));
    await expect(solicitudMovil('sesion', 'secreto', 'estado')).rejects.toMatchObject({ status: 410, message: 'Vinculación terminada.' });
  });

  it('conserva el acceso al túnel privado solo para la API del mismo origen', async () => {
    vi.stubEnv('VITE_LECTOR_TUNEL_PRIVADO', 'true');
    vi.stubEnv('VITE_API_URL', '/api');
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ conectado: true }) });
    vi.stubGlobal('fetch', fetch);
    await solicitudMovil('sesion', 'secreto', 'conectar', { method: 'POST' });
    expect(fetch).toHaveBeenCalledWith('https://farmacom.example/api/lector-movil/movil/sesion/conectar', expect.objectContaining({ credentials: 'same-origin', headers: expect.objectContaining({ Authorization: 'Bearer secreto' }) }));
  });

  it('rechaza otra API antes de enviar cookies o credenciales en modo túnel privado', async () => {
    vi.stubEnv('VITE_LECTOR_TUNEL_PRIVADO', 'true');
    vi.stubEnv('VITE_API_URL', 'https://otro.example/api');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(solicitudMovil('sesion', 'secreto', 'estado')).rejects.toThrow('misma dirección HTTPS');
    expect(fetch).not.toHaveBeenCalled();
  });
});
