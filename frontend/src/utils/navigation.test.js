import { describe, expect, it } from 'vitest';
import { getDefaultRouteForRole } from './navigation';

describe('getDefaultRouteForRole', () => {
  it('envía a dueño y administrador a /usuarios', () => {
    expect(getDefaultRouteForRole('dueno')).toBe('/usuarios');
    expect(getDefaultRouteForRole('administrador')).toBe('/usuarios');
  });

  it('envía al laboratorista a /laboratorio/pacientes', () => {
    expect(getDefaultRouteForRole('laboratorista')).toBe('/laboratorio/pacientes');
  });

  it('envía cualquier otro rol al dashboard', () => {
    expect(getDefaultRouteForRole('dependiente')).toBe('/dashboard');
    expect(getDefaultRouteForRole(undefined)).toBe('/dashboard');
  });
});
