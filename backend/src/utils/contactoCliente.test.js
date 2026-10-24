const {
  normalizarTelefono,
  normalizarCorreo,
  esTelefonoValido,
  esCorreoValido,
} = require('./contactoCliente');

describe('contactoCliente', () => {
  it.each([
    [' 5555-1234 ', '55551234'],
    ['(502) 5555 1234', '50255551234'],
    ['+502 5555.1234', '+50255551234'],
    [null, ''],
  ])('normaliza el teléfono %p a %p', (entrada, esperado) => {
    expect(normalizarTelefono(entrada)).toBe(esperado);
  });

  it.each([
    ['55551234', true],
    ['+50255551234', true],
    ['5555123', false],
    ['1234567890123456', false],
    ['5555abcd', false],
    ['50+255551234', false],
  ])('valida el teléfono %p como %p', (numero, esperado) => {
    expect(esTelefonoValido(numero)).toBe(esperado);
  });

  it('normaliza el correo a minúsculas sin espacios', () => {
    expect(normalizarCorreo('  Ana@FarmaCom.Test ')).toBe('ana@farmacom.test');
    expect(normalizarCorreo(undefined)).toBe('');
  });

  it.each([
    ['ana@farmacom.test', true],
    ['ana@farmacom', false],
    ['ana farmacom.test', false],
    [`${'a'.repeat(140)}@farmacom.test`, false],
  ])('valida el correo %p como %p', (correo, esperado) => {
    expect(esCorreoValido(correo)).toBe(esperado);
  });
});
