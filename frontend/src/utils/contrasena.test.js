import { describe, expect, it, vi } from 'vitest';
import { errorContrasena, generarContrasena } from './contrasena';

describe('generación de contraseñas', () => {
  it('obtiene los 20 símbolos del generador criptográfico', () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((bytes) => {
      bytes.set(Array.from({ length: 20 }, (_, i) => i + 48));
      return bytes;
    });
    try {
      const clave = generarContrasena();
      expect(random).toHaveBeenCalledOnce();
      expect(clave).toBe('wxyz0123456789-_ABCD');
      expect(errorContrasena(clave)).toBeNull();
    } finally { random.mockRestore(); }
  });
  it('no genera claves si falla la fuente criptográfica', () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(() => { throw new Error('No disponible'); });
    try { expect(() => generarContrasena()).toThrow('No disponible'); }
    finally { random.mockRestore(); }
  });
});
