export const REQUISITOS_CONTRASENA = 'Usa al menos 15 caracteres.';

export function errorContrasena(valor) {
  const clave = valor.trim();
  if ([...clave].length < 15) return 'La contraseña debe tener al menos 15 caracteres.';
  if (new TextEncoder().encode(clave).length > 72) return 'La contraseña es demasiado larga. Usa una más corta.';
  return null;
}
