import { describe, expect, it } from 'vitest';
import { notifyUnauthorized, setUnauthorizedHandler } from './authSession';

describe('authSession', () => {
  it('no hace nada si notifica sin haber registrado un handler', () => {
    expect(() => notifyUnauthorized(new Error('401'))).not.toThrow();
  });

  it('invoca el handler registrado cuando se notifica un error', () => {
    const recibidos = [];
    setUnauthorizedHandler((error) => recibidos.push(error));

    const error = new Error('401');
    notifyUnauthorized(error);

    expect(recibidos).toEqual([error]);
  });

  it('deja de invocar el handler después de darse de baja', () => {
    const recibidos = [];
    const darDeBaja = setUnauthorizedHandler((error) => recibidos.push(error));

    darDeBaja();
    notifyUnauthorized(new Error('401'));

    expect(recibidos).toEqual([]);
  });

  it('un handler nuevo reemplaza al anterior', () => {
    const primeros = [];
    const segundos = [];
    setUnauthorizedHandler((error) => primeros.push(error));
    setUnauthorizedHandler((error) => segundos.push(error));

    notifyUnauthorized(new Error('401'));

    expect(primeros).toEqual([]);
    expect(segundos).toHaveLength(1);
  });

  it('darse de baja de un handler ya reemplazado no afecta al handler actual', () => {
    const primeros = [];
    const segundos = [];
    const darDeBajaPrimero = setUnauthorizedHandler((error) => primeros.push(error));
    setUnauthorizedHandler((error) => segundos.push(error));

    darDeBajaPrimero();
    notifyUnauthorized(new Error('401'));

    expect(segundos).toHaveLength(1);
  });
});
