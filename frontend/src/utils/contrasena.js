export const REQUISITOS_CONTRASENA = 'Usa al menos 15 caracteres.';

export function generarContrasena() {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = new Uint8Array(20);
  globalThis.crypto.getRandomValues(bytes);
  // 64 símbolos: cada índice tiene la misma probabilidad, sin sesgo de módulo.
  return Array.from(bytes, (byte) => alfabeto[byte & 63]).join('');
}

export function errorContrasena(valor) {
  const clave = valor.trim();
  if ([...clave].length < 15) return 'La contraseña debe tener al menos 15 caracteres.';
  if (new TextEncoder().encode(clave).length > 72) return 'La contraseña es demasiado larga. Usa una más corta.';
  return null;
}
