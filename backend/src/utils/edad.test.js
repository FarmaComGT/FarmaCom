const { calcularEdad } = require('./edad');

describe('calcularEdad', () => {
  it('devuelve null si no hay fecha de nacimiento', () => {
    expect(calcularEdad(null)).toBeNull();
    expect(calcularEdad(undefined)).toBeNull();
  });

  it('calcula la edad cuando ya cumplió años este año', () => {
    const hoy = new Date();
    const nacimiento = new Date(Date.UTC(hoy.getUTCFullYear() - 30, 0, 1));
    expect(calcularEdad(nacimiento)).toBe(30);
  });

  it('no suma el año todavía si el cumpleaños no ha llegado', () => {
    const hoy = new Date();
    const nacimiento = new Date(Date.UTC(hoy.getUTCFullYear() - 30, hoy.getUTCMonth() + 1, hoy.getUTCDate()));
    expect(calcularEdad(nacimiento)).toBe(29);
  });
});
