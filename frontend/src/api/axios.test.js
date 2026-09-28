import { afterEach, describe, expect, it, vi } from 'vitest';
import * as authSession from './authSession';
import api from './axios';

describe('instancia de axios', () => {
  const obtenerInterceptorDeRespuesta = () => api.interceptors.response.handlers[0];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deja pasar las respuestas exitosas sin tocarlas', () => {
    const { fulfilled } = obtenerInterceptorDeRespuesta();
    const respuesta = { status: 200, data: {} };

    expect(fulfilled(respuesta)).toBe(respuesta);
  });

  it('notifica un 401 cuando no se pidió omitir el manejo global', async () => {
    const spy = vi.spyOn(authSession, 'notifyUnauthorized');
    const { rejected } = obtenerInterceptorDeRespuesta();
    const error = { response: { status: 401 }, config: {} };

    await expect(rejected(error)).rejects.toBe(error);
    expect(spy).toHaveBeenCalledWith(error);
  });

  it('no notifica un 401 cuando la petición pidió skipAuthHandling', async () => {
    const spy = vi.spyOn(authSession, 'notifyUnauthorized');
    const { rejected } = obtenerInterceptorDeRespuesta();
    const error = { response: { status: 401 }, config: { skipAuthHandling: true } };

    await expect(rejected(error)).rejects.toBe(error);
    expect(spy).not.toHaveBeenCalled();
  });

  it('no notifica errores que no sean 401', async () => {
    const spy = vi.spyOn(authSession, 'notifyUnauthorized');
    const { rejected } = obtenerInterceptorDeRespuesta();
    const error = { response: { status: 500 }, config: {} };

    await expect(rejected(error)).rejects.toBe(error);
    expect(spy).not.toHaveBeenCalled();
  });
});
